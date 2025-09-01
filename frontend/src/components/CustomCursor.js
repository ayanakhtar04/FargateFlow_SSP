
import React, { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const cursorRef = useRef(null);
  const requestRef = useRef();
  const [mouse, setMouse] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [cursor, setCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isDown, setIsDown] = useState(false);

  // Smooth trailing animation
  const animate = () => {
    setCursor((prev) => {
      const dx = mouse.x - prev.x;
      const dy = mouse.y - prev.y;
      return {
        x: prev.x + dx * 0.18,
        y: prev.y + dy * 0.18,
      };
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
    // eslint-disable-next-line
  }, [mouse]);

  useEffect(() => {
    const moveCursor = (e) => setMouse({ x: e.clientX, y: e.clientY });
    const handleDown = () => setIsDown(true);
    const handleUp = () => setIsDown(false);
    document.addEventListener('mousemove', moveCursor);
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('mouseup', handleUp);
    };
  }, []);

  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${cursor.x - 16}px, ${cursor.y - 16}px, 0)`;
    }
  }, [cursor]);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: isDown ? 32 : 28,
        height: isDown ? 32 : 28,
        background: 'rgba(103,250,62,0.18)',
        border: isDown ? '3px solid #67FA3E' : '2px solid #67FA3E',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 9999,
        boxShadow: isDown
          ? '0 0 24px 6px #67FA3E, 0 2px 8px 0 rgba(103,250,62,0.18)'
          : '0 0 16px 2px #67FA3E, 0 2px 8px 0 rgba(103,250,62,0.10)',
        mixBlendMode: 'difference',
        transition:
          'width 0.15s cubic-bezier(.4,0,.2,1), height 0.15s cubic-bezier(.4,0,.2,1), border 0.15s, box-shadow 0.18s, background 0.18s',
        backdropFilter: 'blur(2px)',
      }}
    />
  );
};

export default CustomCursor;
