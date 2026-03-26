import React, { useEffect, useState } from 'react';

const StartupAnimation: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // The animation takes exactly 2.4 seconds to completely finish the warp effect.
    // Unmount the component at 2.5s so it doesn't block clicks on the actual website.
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="uniride-startup-overlay">
      {/* The text itself takes the uniride-brand class to ensure Arial Black 900 styling */}
      <div className="uniride-startup-text uniride-brand">
        UniRide
      </div>
    </div>
  );
};

export default StartupAnimation;
