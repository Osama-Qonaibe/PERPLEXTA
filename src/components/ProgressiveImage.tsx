import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface ProgressiveImageProps {
  src: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  placeholderSrc,
  alt,
  className = '',
  wrapperClassName = '',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  const activeSrc = isError ? (placeholderSrc || src) : src;

  return (
    <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-900 ${wrapperClassName}`}>
      {/* Low-res or blur placeholder */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse filter blur-xl scale-110" />
      )}

      {placeholderSrc && !isLoaded && !isError && (
        <img
          src={placeholderSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover filter blur-lg scale-105 transition-opacity duration-500 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
        />
      )}

      {/* High-res image */}
      <motion.img
        ref={imgRef}
        src={activeSrc}
        alt={alt}
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{
          opacity: (isLoaded || isError) ? 1 : 0,
          filter: isLoaded ? 'blur(0px)' : 'blur(5px)',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setIsError(true);
          setIsLoaded(true);
        }}
        className={`w-full h-full object-cover transition-all duration-300 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
