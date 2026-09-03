import React from 'react';
import { UniversalMediaPlayer } from './UniversalMediaPlayer';
import { MediaAspectRatio } from '../context/VideoResourceContext';

export interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  isRtl?: boolean;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  aspectRatio?: MediaAspectRatio;
  resourceId?: string | number;
  onEnded?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  className = '',
  isRtl = true,
  title,
  autoPlay = false,
  muted = false,
  loop = false,
  aspectRatio = 'auto',
  resourceId,
  onEnded
}) => {
  // Extract hash aspect ratio if present in URL (e.g. video.mp4#aspect=9:16)
  let initialRatio = aspectRatio;
  if (aspectRatio === 'auto' && src.includes('#aspect=')) {
    const hash = src.split('#aspect=')[1] || '';
    initialRatio = (hash.split('&')[0] as MediaAspectRatio) || 'auto';
  }

  return (
    <UniversalMediaPlayer
      url={src}
      resourceId={resourceId}
      posterUrl={poster}
      title={title}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      aspectRatio={initialRatio}
      isRtl={isRtl}
      className={className}
      onEnded={onEnded}
    />
  );
};
