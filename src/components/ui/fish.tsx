import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChatWindow from './ChatWindow';

const Fish = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteClicked, setInviteClicked] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Gérer le scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Show invitation bubble after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inviteClicked && !isChatOpen) {
        setShowInvite(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [inviteClicked, isChatOpen]);
  
  const handleMouseEnter = () => {
    if (!isChatOpen) {
      setIsHovered(true);
      setShowBubble(true);
      
      // Hide bubble after 3 seconds
      setTimeout(() => {
        setShowBubble(false);
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  
  const handleFishClick = () => {
    console.log("✅ Bulle cliquée");
    setInviteClicked(true);
    setShowInvite(false);
    setIsChatOpen(!isChatOpen);
    setIsHovered(false);
  };

  const isIos = () => {
    if (typeof window !== "undefined") {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
    return false;
  };

  return (
    <>
      <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      <div 
        className={cn(
          "fixed transition-all duration-500 ease-in-out",
          // Z-index management
          isChatOpen ? "z-40" : "z-50",
          // Desktop positioning
          "md:bottom-16 md:left-8",
          // Mobile positioning - ajusté pour être toujours visible
          `${isIos() ? 'bottom-28' : 'bottom-20'} left-4 sm:bottom-8`,
          // Scroll behavior
          isScrolled && !isChatOpen ? "translate-y-[60%] opacity-50 hover:translate-y-0 hover:opacity-100" : "",
          isChatOpen ? "md:translate-x-12 translate-y-8" : "",
          // Ajout d'une classe pour gérer la position initiale sur mobile
          "initial-position"
        )}
      >
        {/* Invitation Bubble */}
        {showInvite && !isChatOpen && (
          <div
            onClick={handleFishClick}
            className={cn(
              "absolute transform bg-white rounded-xl p-3 shadow-lg invitation-bubble cursor-pointer",
              "md:-top-20 md:left-0 md:translate-x-1/4",
              "left-0 -top-16 min-w-[140px] max-w-[220px] sm:min-w-[160px]",
              "mobile-invite-bubble",
              "z-[9999]"
            )}
          >
            <p
              className="text-sm font-medium text-gray-800 whitespace-normal"
              onClick={handleFishClick}
            >
              Besoin d'aide ? 🐟
            </p>
            <div
              className={cn(
                "absolute w-4 h-4 bg-white transform rotate-45",
                "md:-bottom-2 md:left-4",
                "-bottom-2 left-4"
              )}
            ></div>
          </div>
        )}
        
        <div 
          className={cn(
            "fish-container transition-all duration-300 cursor-pointer relative",
            isHovered ? "scale-110" : "",
            isChatOpen ? "opacity-75 scale-75 translate-y-4" : "",
            // Ajout d'une ombre pour mieux voir le poisson
            "drop-shadow-lg"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleFishClick}
        >
          {/* Main Fish SVG */}
          <svg
            width="80"
            height="60"
            viewBox="0 0 120 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              "fish-swim",
              isHovered ? "fish-swim-slow" : "",
              isChatOpen ? "fish-active" : ""
            )}
          >
            {/* Fish Body */}
            <path
              d="M90 40C90 57.6142 74.8528 70 55 70C35.1472 70 10 57.6142 10 40C10 22.3858 35.1472 10 55 10C74.8528 10 90 22.3858 90 40Z"
              fill="url(#fishGradient)"
              className="fish-body"
            />
            
            {/* Tail */}
            <path
              d="M80 40C95 25 110 15 118 40C110 65 95 55 80 40Z"
              fill="url(#tailGradient)"
              className="fish-tail"
            />
            
            {/* Top Fin */}
            <path
              d="M50 12C60 0 70 5 60 15C50 25 40 20 50 12Z"
              fill="url(#finGradient)"
              className="fish-fin-top"
            />
            
            {/* Bottom Fin */}
            <path
              d="M50 68C60 80 70 75 60 65C50 55 40 60 50 68Z"
              fill="url(#finGradient)"
              className="fish-fin-bottom"
            />
            
            {/* Eye Outer */}
            <circle cx="30" cy="30" r="8" fill="white" />
            
            {/* Eye Pupil */}
            <circle 
              cx="30" 
              cy="30" 
              r="4" 
              fill="#333" 
              className={cn(
                "fish-eye",
                isHovered ? "fish-eye-blink" : ""
              )}
            />
            
            {/* Gradients */}
            <defs>
              <radialGradient id="fishGradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#1EAEDB" />
                <stop offset="100%" stopColor="#0b72a4" />
              </radialGradient>
              <radialGradient id="tailGradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#1EAEDB" />
                <stop offset="100%" stopColor="#0b72a4" />
              </radialGradient>
              <radialGradient id="finGradient" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#33C3F0" />
                <stop offset="100%" stopColor="#1EAEDB" />
              </radialGradient>
            </defs>
          </svg>
          
          {/* Bubble */}
          {showBubble && !isChatOpen && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bubble-rise">
              <svg width="20" height="20" viewBox="0 0 30 30">
                <circle cx="15" cy="15" r="12" fill="rgba(255, 255, 255, 0.6)" />
              </svg>
            </div>
          )}
          
          {/* Random Bubbles */}
          <div className="bubble-small bubble-random-1"></div>
          <div className="bubble-small bubble-random-2"></div>
          <div className="bubble-small bubble-random-3"></div>
        </div>
      </div>
    </>
  );
};

export default Fish;