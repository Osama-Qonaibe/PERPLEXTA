import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fallbackComponent?: React.ReactNode;
  wrapperClassName?: string;
  showBrandedPlaceholder?: boolean;
  lazy?: boolean;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  fallbackSrc,
  fallbackComponent,
  showBrandedPlaceholder = true,
  lazy = true,
  onError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInView, setIsInView] = useState(!lazy);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lazy) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy]);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    if (!src) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoading(false);
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    if (props.onLoad) {
      props.onLoad(e);
    }
  };

  const isInvalid = hasError || !src;

  return (
    <div ref={containerRef} className={`relative overflow-hidden inline-block ${wrapperClassName}`}>
      {isInvalid ? (
        fallbackComponent || (
          showBrandedPlaceholder ? (
            <div className="w-full h-full min-h-[120px] bg-[var(--surface-subtle)] dark:bg-neutral-950 flex flex-col items-center justify-center p-4 border border-[var(--border-main)] rounded-xl text-center select-none transition-theme">
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-main)] flex items-center justify-center mb-2.5 shadow-sm">
                <ImageIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
              </div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wide">
                Perplexta Media
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-600 mt-0.5">
                {alt ? `"${alt}"` : 'Image unavailable'}
              </span>
            </div>
          ) : (
            <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-neutral-400" />
            </div>
          )
        )
      ) : isInView ? (
        <div className="relative w-full h-full">
          {isLoading && (
            <div className={`absolute inset-0 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 animate-pulse flex items-center justify-center ${className}`}>
              <div className="w-6 h-6 rounded-full border-2 border-accent-500/30 border-t-accent-500 animate-spin opacity-60" />
            </div>
          )}
          <img
            {...props}
            src={src}
            alt={alt}
            className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onError={handleError}
            onLoad={handleLoad}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className={`w-full h-full min-h-[100px] bg-[var(--surface-subtle)] animate-pulse ${className}`} />
      )}
    </div>
  );
};
