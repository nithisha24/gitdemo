import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { voiceAudioBridge } from '../services/voiceAudioBridge';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRotationState {
  leftPitch: number;
  rightPitch: number;
  progress: number;
}

/**
 * Constructs a high-resolution procedural 3D anatomical mannequin head
 * (with forehead, brow ridge, eye sockets, nose bridge & tip, cheekbones,
 * lips, chin, jawline, and neck) used immediately on frame 0 before/if
 * the external GLB mesh finishes loading.
 */
function createProceduralMannequinHeadGeometry(): THREE.BufferGeometry {
  const radialSegs = 96;
  const heightSegs = 96;
  const geom = new THREE.SphereGeometry(2.2, radialSegs, heightSegs);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ny = v.y / 2.2; // -1 (bottom) to +1 (top)
    const theta = Math.atan2(v.x, v.z); // 0 is front (+Z)
    const absTheta = Math.abs(theta);

    let x = v.x;
    let y = v.y * 1.45;
    let z = v.z;

    if (ny < -0.45) {
      // Taper into cylindrical anatomical neck and collar base
      const neckT = Math.min(1, (-0.45 - ny) / 0.55);
      const neckRadius = 0.48 + 0.22 * Math.pow(neckT, 1.6);
      x *= neckRadius;
      z = z * neckRadius - 0.35 * neckT;
      y = -1.2 - neckT * 2.4;
    } else {
      // Cranium & facial structure
      const faceMask = Math.max(0, Math.cos(theta));
      // Narrow temples and jaw compared to cranium depth
      x *= 0.82 - 0.12 * Math.max(0, -ny);
      z *= 0.96;

      // Forehead dome & brow ridge (ny around 0.25..0.55)
      const brow = Math.exp(-Math.pow((ny - 0.28) / 0.11, 2)) * Math.exp(-Math.pow(theta / 0.65, 2));
      z += brow * 0.36;

      // Eye sockets (ny around 0.14, absTheta around 0.28)
      const eyeSocket =
        Math.exp(-Math.pow((ny - 0.14) / 0.09, 2)) *
        Math.exp(-Math.pow((absTheta - 0.27) / 0.14, 2));
      z -= eyeSocket * 0.34;

      // Prominent sculpted nose bridge and tip (ny from -0.08 to 0.22, center theta ~ 0)
      const noseProfile =
        Math.exp(-Math.pow((ny - 0.02) / 0.16, 2)) *
        Math.exp(-Math.pow(theta / 0.13, 2));
      const noseTip =
        Math.exp(-Math.pow((ny + 0.06) / 0.07, 2)) *
        Math.exp(-Math.pow(theta / 0.1, 2));
      z += noseProfile * 0.58 + noseTip * 0.32;

      // Cheekbones (zygomatic arch)
      const cheek =
        Math.exp(-Math.pow((ny - 0.0) / 0.16, 2)) *
        Math.exp(-Math.pow((absTheta - 0.48) / 0.22, 2));
      x += Math.sign(x) * cheek * 0.22;
      z += cheek * 0.24;

      // Upper and lower lips
      const upperLip =
        Math.exp(-Math.pow((ny + 0.2) / 0.045, 2)) *
        Math.exp(-Math.pow(theta / 0.22, 2));
      const lowerLip =
        Math.exp(-Math.pow((ny + 0.28) / 0.045, 2)) *
        Math.exp(-Math.pow(theta / 0.2, 2));
      z += (upperLip * 0.28 + lowerLip * 0.25) * faceMask;

      // Chin (menton) and jawline
      const chin =
        Math.exp(-Math.pow((ny + 0.42) / 0.09, 2)) *
        Math.exp(-Math.pow(theta / 0.26, 2));
      z += chin * 0.34;
    }

    pos.setXYZ(i, x, y + 0.4, z);
  }

  geom.computeVertexNormals();
  return geom;
}

interface MannequinHeadProps {
  side: 'left' | 'right';
  headGeometry: THREE.BufferGeometry;
  scrollStateRef: React.MutableRefObject<ScrollRotationState>;
  audioStateRef: React.MutableRefObject<{ isPlaying: boolean; level: number }>;
  position: [number, number, number];
  scale: number;
  inwardYaw: number;
  prefersReducedMotion: boolean;
}

const MannequinHeadMesh: React.FC<MannequinHeadProps> = ({
  side,
  headGeometry,
  scrollStateRef,
  audioStateRef,
  position,
  scale,
  inwardYaw,
  prefersReducedMotion,
}) => {
  const pitchGroupRef = useRef<THREE.Group>(null);
  const vocalEmitterRef = useRef<THREE.MeshStandardMaterial>(null);
  const collarGlowRef = useRef<THREE.MeshBasicMaterial>(null);

  const isLeft = side === 'left';

  useFrame(({ clock }) => {
    if (!pitchGroupRef.current) return;

    const targetPitch = isLeft
      ? scrollStateRef.current.leftPitch
      : scrollStateRef.current.rightPitch;

    // Clamp pitch safely within [-0.52, +0.52] radians (~30 deg) to prevent flips
    const clampedPitch = Math.max(-0.52, Math.min(0.52, targetPitch));

    // Subtle breathing / conversational micro-nod when reduced motion is off
    const t = clock.getElapsedTime();
    const idleNod = prefersReducedMotion
      ? 0
      : Math.sin(t * (isLeft ? 1.5 : 1.35) + (isLeft ? 0 : 1.8)) * 0.025;

    // Smoothly damp pitch rotation
    pitchGroupRef.current.rotation.x = THREE.MathUtils.lerp(
      pitchGroupRef.current.rotation.x,
      clampedPitch + idleNod,
      0.16
    );

    // Modulate vocal emitter & collar glow to reflect alternating 2-way conversation
    const turnWave = Math.sin(t * 1.4);
    const speakerTurn = isLeft
      ? THREE.MathUtils.smoothstep(turnWave, -0.3, 0.7)
      : THREE.MathUtils.smoothstep(-turnWave, -0.3, 0.7);
    const audioBoost = audioStateRef.current.isPlaying
      ? 0.45 + audioStateRef.current.level * 0.85
      : 0.25 + speakerTurn * 0.55;

    if (vocalEmitterRef.current) {
      vocalEmitterRef.current.emissiveIntensity = 1.2 + audioBoost * 2.2;
    }
    if (collarGlowRef.current) {
      collarGlowRef.current.opacity = 0.45 + audioBoost * 0.4;
    }
  });

  // Mirror X scale on the right head so both heads have symmetrical studio anatomy
  const meshScale: [number, number, number] = isLeft
    ? [scale, scale, scale]
    : [-scale, scale, scale];

  return (
    <group position={position} rotation={[0, inwardYaw, 0]}>
      {/* Inner group rotates around local X axis (ear-to-ear horizontal axis) for vertical pitching */}
      <group ref={pitchGroupRef}>
        <group scale={meshScale}>
          {/* Main 3D Mannequin Head & Neck Mesh */}
          <mesh geometry={headGeometry} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={isLeft ? '#0A2558' : '#0D2250'}
              emissive={isLeft ? '#071B3A' : '#11163E'}
              emissiveIntensity={0.4}
              metalness={0.54}
              roughness={0.22}
              clearcoat={0.95}
              clearcoatRoughness={0.14}
              reflectivity={0.95}
            />
          </mesh>

          {/* Subtle internal mouth glow light source */}
          <mesh position={[0, 0.46, 2.05]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial
              ref={vocalEmitterRef}
              color="#00D4E8"
              emissive={isLeft ? '#00D4E8' : '#1769F8'}
              emissiveIntensity={1.8}
              roughness={0.1}
            />
          </mesh>

          {/* Sculpted Mannequin Bust Collar / Pedestal Base */}
          <group position={[0, -3.72, -0.35]} rotation={[0.06, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[1.65, 2.05, 0.38, 48]} />
              <meshPhysicalMaterial
                color="#071B3A"
                metalness={0.7}
                roughness={0.2}
                clearcoat={0.9}
              />
            </mesh>
            <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.68, 0.05, 16, 64]} />
              <meshBasicMaterial
                ref={collarGlowRef}
                color={isLeft ? '#00D4E8' : '#1769F8'}
                transparent
                opacity={0.75}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

interface SoundWaveBridgeProps {
  leftHeadPos: [number, number, number];
  rightHeadPos: [number, number, number];
  headScale: number;
  inwardYaw: number;
  scrollStateRef: React.MutableRefObject<ScrollRotationState>;
  audioStateRef: React.MutableRefObject<{ isPlaying: boolean; level: number }>;
  prefersReducedMotion: boolean;
}

interface WaveStrandConfig {
  id: number;
  color: string;
  direction: 1 | -1; // +1 = Left->Right, -1 = Right->Left
  frequency: number;
  speed: number;
  amplitudeY: number;
  amplitudeZ: number;
  yOffset: number;
  zOffset: number;
  phaseOffset: number;
  radius: number;
  baseOpacity: number;
}

const WAVE_STRANDS: WaveStrandConfig[] = [
  {
    id: 0,
    color: '#00D4E8', // Cyan primary Left -> Right
    direction: 1,
    frequency: 3.5,
    speed: 4.2,
    amplitudeY: 0.42,
    amplitudeZ: 0.22,
    yOffset: 0.0,
    zOffset: 0.18,
    phaseOffset: 0.0,
    radius: 0.036,
    baseOpacity: 0.92,
  },
  {
    id: 1,
    color: '#1769F8', // Royal Blue primary Right -> Left
    direction: -1,
    frequency: 3.0,
    speed: 3.8,
    amplitudeY: 0.38,
    amplitudeZ: 0.25,
    yOffset: 0.06,
    zOffset: -0.14,
    phaseOffset: 1.2,
    radius: 0.034,
    baseOpacity: 0.88,
  },
  {
    id: 2,
    color: '#00D4E8', // Cyan harmonic Left -> Right
    direction: 1,
    frequency: 4.5,
    speed: 4.8,
    amplitudeY: 0.28,
    amplitudeZ: 0.3,
    yOffset: -0.08,
    zOffset: 0.08,
    phaseOffset: 2.4,
    radius: 0.024,
    baseOpacity: 0.78,
  },
  {
    id: 3,
    color: '#1769F8', // Royal Blue harmonic Right -> Left
    direction: -1,
    frequency: 4.0,
    speed: 4.4,
    amplitudeY: 0.32,
    amplitudeZ: 0.2,
    yOffset: -0.04,
    zOffset: -0.06,
    phaseOffset: 3.6,
    radius: 0.025,
    baseOpacity: 0.8,
  },
  {
    id: 4,
    color: '#6D28D9', // Restrained Electric Violet accent Left -> Right
    direction: 1,
    frequency: 2.5,
    speed: 3.2,
    amplitudeY: 0.46,
    amplitudeZ: 0.32,
    yOffset: 0.1,
    zOffset: -0.2,
    phaseOffset: 4.5,
    radius: 0.022,
    baseOpacity: 0.68,
  },
  {
    id: 5,
    color: '#6D28D9', // Restrained Electric Violet accent Right -> Left
    direction: -1,
    frequency: 5.0,
    speed: 5.1,
    amplitudeY: 0.22,
    amplitudeZ: 0.18,
    yOffset: -0.1,
    zOffset: 0.22,
    phaseOffset: 5.4,
    radius: 0.018,
    baseOpacity: 0.62,
  },
];

const NUM_WAVE_POINTS = 56;

const SoundWaveBridge: React.FC<SoundWaveBridgeProps> = ({
  leftHeadPos,
  rightHeadPos,
  headScale,
  inwardYaw,
  scrollStateRef,
  audioStateRef,
  prefersReducedMotion,
}) => {
  const strandMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const strandMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const pulseRingRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Pre-allocate curve point vectors for zero-GC updates in useFrame
  const strandPoints = useMemo(
    () =>
      WAVE_STRANDS.map(() =>
        Array.from({ length: NUM_WAVE_POINTS }, () => new THREE.Vector3())
      ),
    []
  );

  // Initial curves & tube geometries
  const initialGeometries = useMemo(() => {
    return WAVE_STRANDS.map((strand) => {
      const pts = Array.from({ length: NUM_WAVE_POINTS }, (_, idx) => {
        const u = idx / (NUM_WAVE_POINTS - 1);
        const x = THREE.MathUtils.lerp(-2.2, 2.2, u);
        const env = Math.sin(u * Math.PI);
        const y =
          leftHeadPos[1] +
          0.2 +
          Math.sin(u * Math.PI * strand.frequency + strand.phaseOffset) *
            strand.amplitudeY *
            env;
        const z =
          leftHeadPos[2] +
          0.8 +
          Math.cos(u * Math.PI * strand.frequency + strand.phaseOffset) *
            strand.amplitudeZ *
            env;
        return new THREE.Vector3(x, y, z);
      });
      const curve = new THREE.CatmullRomCurve3(pts);
      return new THREE.TubeGeometry(curve, 64, strand.radius, 8, false);
    });
  }, [leftHeadPos]);

  useFrame(({ clock }) => {
    const t = prefersReducedMotion ? 1.2 : clock.getElapsedTime();

    // Calculate live mouth positions in world space based on head pitch rotation
    const mouthLocalY = 0.45 * headScale;
    const mouthLocalZ = 2.34 * headScale;

    const lPitch = Math.max(-0.52, Math.min(0.52, scrollStateRef.current.leftPitch));
    const rPitch = Math.max(-0.52, Math.min(0.52, scrollStateRef.current.rightPitch));

    // Local mouth vector after pitching around local X axis
    const lMouthY = mouthLocalY * Math.cos(lPitch) - mouthLocalZ * Math.sin(lPitch);
    const lMouthForward = mouthLocalY * Math.sin(lPitch) + mouthLocalZ * Math.cos(lPitch);

    const rMouthY = mouthLocalY * Math.cos(rPitch) - mouthLocalZ * Math.sin(rPitch);
    const rMouthForward = mouthLocalY * Math.sin(rPitch) + mouthLocalZ * Math.cos(rPitch);

    // Project forward along inwardYaw (+inwardYaw on left, -inwardYaw on right)
    const startX = leftHeadPos[0] + Math.sin(inwardYaw) * lMouthForward;
    const startY = leftHeadPos[1] + lMouthY;
    const startZ = leftHeadPos[2] + Math.cos(inwardYaw) * lMouthForward;

    const endX = rightHeadPos[0] - Math.sin(inwardYaw) * rMouthForward;
    const endY = rightHeadPos[1] + rMouthY;
    const endZ = rightHeadPos[2] + Math.cos(inwardYaw) * rMouthForward;

    // Two-way conversation alternation: smoothly alternates dominant direction
    const convCycle = Math.sin(t * 1.35);
    const leftToRightEnergy = 0.65 + 0.35 * convCycle;
    const rightToLeftEnergy = 0.65 - 0.35 * convCycle;

    const audioMultiplier = audioStateRef.current.isPlaying
      ? 1.35 + audioStateRef.current.level * 0.65
      : 1.0;

    WAVE_STRANDS.forEach((strand, sIdx) => {
      const mesh = strandMeshRefs.current[sIdx];
      const mat = strandMatRefs.current[sIdx];
      if (!mesh) return;

      const pts = strandPoints[sIdx];
      const dirEnergy = strand.direction === 1 ? leftToRightEnergy : rightToLeftEnergy;
      const ampScale = dirEnergy * audioMultiplier;

      for (let i = 0; i < NUM_WAVE_POINTS; i++) {
        const u = i / (NUM_WAVE_POINTS - 1);
        // Pin endpoints cleanly to the two mouths with smooth bell envelope in between
        const envelope = Math.sin(u * Math.PI);
        const secondaryEnvelope = Math.pow(envelope, 0.85);

        const baseX = THREE.MathUtils.lerp(startX, endX, u);
        const baseY = THREE.MathUtils.lerp(startY, endY, u);
        const baseZ = THREE.MathUtils.lerp(startZ, endZ, u);

        // Wave traveling in strand.direction (+1 = Left->Right, -1 = Right->Left)
        const travelPhase =
          u * Math.PI * 2 * strand.frequency -
          strand.direction * t * strand.speed +
          strand.phaseOffset;

        const carrierWave = Math.sin(travelPhase);
        const subHarmonic = Math.cos(travelPhase * 1.5 + t * 1.8) * 0.35;

        const dy =
          (strand.yOffset + (carrierWave + subHarmonic) * strand.amplitudeY * ampScale) *
          secondaryEnvelope;
        const dz =
          (strand.zOffset +
            Math.cos(travelPhase * 0.9) * strand.amplitudeZ * ampScale) *
          secondaryEnvelope;

        pts[i].set(baseX, baseY + dy, baseZ + dz);
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const nextGeom = new THREE.TubeGeometry(curve, 56, strand.radius, 8, false);
      mesh.geometry.dispose();
      mesh.geometry = nextGeom;

      if (mat) {
        mat.opacity = Math.min(1, strand.baseOpacity * (0.75 + 0.25 * dirEnergy));
        mat.emissiveIntensity = (1.1 + 0.9 * dirEnergy) * audioMultiplier;
      }
    });

    // Update traveling 3D acoustic pulse rings between the two heads
    pulseRingRefs.current.forEach((ring, rIdx) => {
      if (!ring) return;
      const isLeftToRight = rIdx % 2 === 0;
      const speed = 0.42 + rIdx * 0.06;
      const rawProgress = (t * speed + rIdx * 0.25) % 1;
      const u = isLeftToRight ? rawProgress : 1 - rawProgress;

      const x = THREE.MathUtils.lerp(startX, endX, u);
      const y =
        THREE.MathUtils.lerp(startY, endY, u) +
        Math.sin(u * Math.PI * 3 - (isLeftToRight ? 1 : -1) * t * 3.5) * 0.12 * Math.sin(u * Math.PI);
      const z = THREE.MathUtils.lerp(startZ, endZ, u);

      ring.position.set(x, y, z);
      const pulseScale = (0.35 + Math.sin(u * Math.PI) * 0.85) * audioMultiplier;
      ring.scale.setScalar(pulseScale);
      ring.rotation.y = Math.PI / 2;
      ring.rotation.z = t * (isLeftToRight ? 1.5 : -1.5);
    });
  });

  return (
    <group>
      {WAVE_STRANDS.map((strand, idx) => (
        <mesh
          key={strand.id}
          ref={(el) => {
            strandMeshRefs.current[idx] = el;
          }}
          geometry={initialGeometries[idx]}
        >
          <meshStandardMaterial
            ref={(el) => {
              strandMatRefs.current[idx] = el;
            }}
            color={strand.color}
            emissive={strand.color}
            emissiveIntensity={1.6}
            roughness={0.15}
            metalness={0.2}
            transparent
            opacity={strand.baseOpacity}
          />
        </mesh>
      ))}

      {/* Traveling 3D Acoustic Pulse Rings */}
      {[0, 1, 2, 3].map((rIdx) => {
        const ringColor = rIdx % 2 === 0 ? '#00D4E8' : rIdx === 1 ? '#1769F8' : '#6D28D9';
        return (
          <mesh
            key={`ring-${rIdx}`}
            ref={(el) => {
              pulseRingRefs.current[rIdx] = el;
            }}
          >
            <torusGeometry args={[0.22, 0.016, 12, 32]} />
            <meshBasicMaterial color={ringColor} transparent opacity={0.65} />
          </mesh>
        );
      })}
    </group>
  );
};

interface SceneContentProps {
  headGeometry: THREE.BufferGeometry;
  scrollStateRef: React.MutableRefObject<ScrollRotationState>;
  audioStateRef: React.MutableRefObject<{ isPlaying: boolean; level: number }>;
  prefersReducedMotion: boolean;
}

const SpeakingHeadsSceneContent: React.FC<SceneContentProps> = ({
  headGeometry,
  scrollStateRef,
  audioStateRef,
  prefersReducedMotion,
}) => {
  const { size, camera } = useThree();

  // Responsive layout adjustments for Desktop, Tablet, and Mobile viewports
  const layout = useMemo(() => {
    const isMobile = size.width < 640;
    const isTablet = size.width >= 640 && size.width < 1024;

    if (isMobile) {
      return {
        leftPos: [-1.55, 1.55, 0] as [number, number, number],
        rightPos: [1.55, 1.55, 0] as [number, number, number],
        headScale: 0.25,
        inwardYaw: Math.PI * 0.38,
        cameraZ: 11.2,
        cameraY: 0.45,
      };
    }
    if (isTablet) {
      return {
        leftPos: [-2.25, 1.5, 0] as [number, number, number],
        rightPos: [2.25, 1.5, 0] as [number, number, number],
        headScale: 0.3,
        inwardYaw: Math.PI * 0.38,
        cameraZ: 10.8,
        cameraY: 0.45,
      };
    }
    return {
      leftPos: [-2.85, 1.45, 0] as [number, number, number],
      rightPos: [2.85, 1.45, 0] as [number, number, number],
      headScale: 0.34,
      inwardYaw: Math.PI * 0.38,
      cameraZ: 10.5,
      cameraY: 0.45,
    };
  }, [size.width]);

  useEffect(() => {
    camera.position.set(0, layout.cameraY, layout.cameraZ);
    camera.lookAt(0, 0.45, 0);
    camera.updateProjectionMatrix();
  }, [camera, layout.cameraY, layout.cameraZ]);

  return (
    <>
      {/* Studio Multi-Point Lighting in EMIQEN Brand Palette */}
      <ambientLight intensity={0.75} color="#F5F8FF" />
      <hemisphereLight args={['#FFFFFF', '#071B3A', 1.15]} />

      {/* Main Front-Top Key Light for Crisp Facial Structure & Specular Highlights */}
      <directionalLight position={[0, 7.5, 9]} intensity={2.8} color="#FFFFFF" />

      {/* Left Rim & Sculpting Light (EMIQEN Royal Blue #1769F8) */}
      <directionalLight position={[-9, 3.5, -2]} intensity={3.8} color="#1769F8" />

      {/* Right Rim & Sculpting Light (EMIQEN Electric Violet #6D28D9) */}
      <directionalLight position={[9, 3.5, -2]} intensity={3.8} color="#6D28D9" />

      {/* Center Acoustic Energy Fill Lights (EMIQEN Cyan #00D4E8 & Royal Blue #1769F8) */}
      <pointLight position={[0, 2.1, 3.2]} intensity={5.2} distance={12} color="#00D4E8" />
      <pointLight position={[-1.8, 1.6, 2.6]} intensity={3.4} distance={9} color="#1769F8" />
      <pointLight position={[1.8, 1.6, 2.6]} intensity={3.4} distance={9} color="#00D4E8" />
      <pointLight position={[0, 0.5, -2.5]} intensity={2.6} distance={10} color="#6D28D9" />

      {/* Left 3D Mannequin Head */}
      <MannequinHeadMesh
        side="left"
        headGeometry={headGeometry}
        scrollStateRef={scrollStateRef}
        audioStateRef={audioStateRef}
        position={layout.leftPos}
        scale={layout.headScale}
        inwardYaw={layout.inwardYaw}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Animated 3D Sound Waves Flowing Between Both Heads */}
      <SoundWaveBridge
        leftHeadPos={layout.leftPos}
        rightHeadPos={layout.rightPos}
        headScale={layout.headScale}
        inwardYaw={layout.inwardYaw}
        scrollStateRef={scrollStateRef}
        audioStateRef={audioStateRef}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Right 3D Mannequin Head */}
      <MannequinHeadMesh
        side="right"
        headGeometry={headGeometry}
        scrollStateRef={scrollStateRef}
        audioStateRef={audioStateRef}
        position={layout.rightPos}
        scale={layout.headScale}
        inwardYaw={-layout.inwardYaw}
        prefersReducedMotion={prefersReducedMotion}
      />
    </>
  );
};

interface SpeakingHeads3DProps {
  triggerRef: React.RefObject<HTMLElement>;
}

export const SpeakingHeads3D: React.FC<SpeakingHeads3DProps> = ({ triggerRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Start immediately with procedural 3D head geometry, then upgrade seamlessly to smoothed GLB bust
  const fallbackGeometry = useMemo(() => createProceduralMannequinHeadGeometry(), []);
  const [headGeometry, setHeadGeometry] = useState<THREE.BufferGeometry>(fallbackGeometry);

  const scrollStateRef = useRef<ScrollRotationState>({
    leftPitch: -0.35, // ~ -20 deg initial vertical pitch
    rightPitch: 0.31, // ~ +18 deg initial vertical pitch
    progress: 0,
  });

  const audioStateRef = useRef<{ isPlaying: boolean; level: number }>({
    isPlaying: false,
    level: 0,
  });

  // Load the smoothed watertight 3D mannequin head GLB model
  useEffect(() => {
    let isMounted = true;
    const loader = new GLTFLoader();
    loader.load(
      '/models/mannequin-head.glb',
      (gltf) => {
        if (!isMounted) return;
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.geometry) {
              const geom = mesh.geometry.clone();
              geom.computeVertexNormals();
              setHeadGeometry(geom);
            }
          }
        });
      },
      undefined,
      () => {
        // Fallback procedural 3D head geometry remains active if GLB fails to load
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to Web Audio playback bridge
  useEffect(() => {
    return voiceAudioBridge.subscribe((state) => {
      audioStateRef.current = state;
    });
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Pause rendering when hero section is scrolled out of the viewport
  useEffect(() => {
    const target = triggerRef.current || containerRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.02 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [triggerRef]);

  // GSAP ScrollTrigger scrubbed vertical rotation for both 3D heads
  useEffect(() => {
    const triggerEl = triggerRef.current || containerRef.current;
    if (!triggerEl) return;

    if (prefersReducedMotion) {
      scrollStateRef.current.leftPitch = 0;
      scrollStateRef.current.rightPitch = 0;
      scrollStateRef.current.progress = 0;
      return;
    }

    const proxy = {
      leftPitch: -0.35, // -20.0 deg
      rightPitch: 0.31, // +17.8 deg
    };

    const updateContainerDataset = (progress: number) => {
      if (containerRef.current) {
        containerRef.current.dataset.scrollProgress = progress.toFixed(3);
        containerRef.current.dataset.leftPitchDeg = THREE.MathUtils.radToDeg(
          scrollStateRef.current.leftPitch
        ).toFixed(1);
        containerRef.current.dataset.rightPitchDeg = THREE.MathUtils.radToDeg(
          scrollStateRef.current.rightPitch
        ).toFixed(1);
      }
    };

    updateContainerDataset(0);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onUpdate: () => {
          scrollStateRef.current.leftPitch = proxy.leftPitch;
          scrollStateRef.current.rightPitch = proxy.rightPitch;
          updateContainerDataset(scrollStateRef.current.progress);
        },
        scrollTrigger: {
          trigger: triggerEl,
          start: 'top top',
          end: '+=520',
          scrub: 0.35,
          onUpdate: (self) => {
            scrollStateRef.current.progress = self.progress;
          },
        },
      });

      // Left head pitches vertically from -20 deg (-0.35 rad) to +26 deg (+0.45 rad)
      tl.to(
        proxy,
        {
          leftPitch: 0.45,
          ease: 'power1.inOut',
          duration: 1,
        },
        0
      );

      // Right head pitches vertically with slightly different timing & angle (+18 deg to -25 deg) for depth
      tl.to(
        proxy,
        {
          rightPitch: -0.44,
          ease: 'sine.inOut',
          duration: 0.95,
        },
        0.05
      );
    });

    return () => {
      ctx.revert();
    };
  }, [triggerRef, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      id="speaking-heads-3d-stage"
      data-scroll-progress="0.000"
      data-left-pitch-deg="-20.1"
      data-right-pitch-deg="17.8"
      className="fixed inset-0 w-full h-screen pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      <Canvas
        frameloop={isVisible ? 'always' : 'demand'}
        dpr={[1, 2]}
        camera={{ position: [0, 0.45, 10.5], fov: 36, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <SpeakingHeadsSceneContent
          headGeometry={headGeometry}
          scrollStateRef={scrollStateRef}
          audioStateRef={audioStateRef}
          prefersReducedMotion={prefersReducedMotion}
        />
      </Canvas>
    </div>
  );
};
