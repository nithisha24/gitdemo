import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { siteContent } from '../data/siteContent';
import { Menu, X, Sparkles, UserCircle2, ArrowRight } from 'lucide-react';

export const SiteHeader: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const scrollPos = window.scrollY + 140;
      let current = '';
      for (const item of siteContent.nav) {
        if (item.href.startsWith('#')) {
          const el = document.querySelector(item.href) as HTMLElement | null;
          if (el && el.offsetTop <= scrollPos) {
            current = item.href;
          }
        }
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    const doScroll = () => {
      const targetElement = document.querySelector(href);
      if (targetElement) {
        const navOffset = 80;
        const offsetPosition =
          targetElement.getBoundingClientRect().top + window.pageYOffset - navOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    };

    if (location.pathname !== '/' && !document.querySelector(href)) {
      navigate('/');
      setTimeout(doScroll, 120);
    } else {
      doScroll();
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-subtle border-b border-emiqen-soft-border/70 py-3'
          : 'bg-white/75 backdrop-blur-sm py-4 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex items-center group transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue rounded-lg"
            aria-label="EMIQEN Home"
          >
            <BrandLogo variant="full" iconSize={36} />
          </a>

          {/* Desktop Navigation anchors */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Main Navigation">
            {siteContent.nav.map((item) => {
              const isActive = activeSection === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  data-active={isActive ? 'true' : 'false'}
                  onClick={(e) => scrollToSection(e, item.href)}
                  className={`nav-link-emiqen ${
                    isActive ? 'text-emiqen-blue font-semibold bg-emiqen-soft-bg/70' : ''
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Desktop CTA area — Login + Sign Up + dev badge */}
          <div className="hidden sm:flex items-center gap-2.5">
            <span className="hidden xl:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/90 px-2.5 py-1 rounded-full border border-slate-200">
              <Sparkles className="w-3 h-3 text-emiqen-blue" />
              <span>In Development</span>
            </span>

            {/* Log In link */}
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-emiqen-navy hover:text-emiqen-blue hover:bg-emiqen-soft-bg/80 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue"
            >
              Log In
            </Link>

            {/* Sign Up button */}
            <Link to="/signup" className="btn-emiqen-primary px-4 py-2 text-sm">
              <UserCircle2 className="w-4 h-4" />
              <span>Sign Up</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center sm:hidden gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-sm font-semibold text-emiqen-blue hover:text-emiqen-blue-hover rounded-lg hover:bg-emiqen-soft-bg transition-colors"
            >
              Log In
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-emiqen-navy hover:bg-slate-100 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="fixed inset-0 top-[60px] z-40 bg-white/95 backdrop-blur-xl sm:hidden border-t border-slate-200 flex flex-col justify-between p-6 overflow-y-auto"
        >
          <div className="space-y-3">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </div>
            <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
              {siteContent.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.href)}
                  className="group px-4 py-3 text-base font-semibold text-slate-800 hover:text-emiqen-blue hover:bg-emiqen-soft-bg rounded-xl transition-all duration-200 flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emiqen-blue group-hover:translate-x-1 transition-all" />
                </a>
              ))}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emiqen-cyan animate-pulse" />
              <span>EMIQEN is under active development for Indian enterprise tasks</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-emiqen-secondary py-3 px-4 text-center text-sm"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-emiqen-primary py-3 px-4 text-center text-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
