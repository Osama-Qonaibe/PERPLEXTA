import React from 'react';
import { UniversalMediaPlayer } from './UniversalMediaPlayer';
import { MediaAspectRatio, MediaFitMode, MediaFormatType } from '../context/VideoResourceContext';

export interface MediaFormatPlayerProps {
  url: string;
  resourceId?: string | number;
  adFormat?: 'feed' | 'story' | 'reel' | 'video' | 'sidebar' | 'banner' | 'instream' | string;
  aspectRatio?: MediaAspectRatio;
  defaultFitMode?: MediaFitMode;
  posterUrl?: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  isRtl?: boolean;
  showControls?: boolean;
  allowFitToggle?: boolean;
  maxHeight?: string;
  onOpenReels?: () => void;
  onEnded?: () => void;
}

/**
 * MediaFormatPlayer
 * Universal multi-format media player powered by the layout-agnostic UniversalMediaPlayer architecture.
 */
export const MediaFormatPlayer: React.FC<MediaFormatPlayerProps> = ({
  url,
  resourceId,
  adFormat = 'feed',
  aspectRatio = 'auto',
  defaultFitMode = 'cover',
  posterUrl,
  title,
  autoPlay = false,
  muted = true,
  className = '',
  isRtl = true,
  showControls = true,
  maxHeight,
  onOpenReels,
  onEnded,
}) => {
  return (
    <UniversalMediaPlayer
      url={url}
      resourceId={resourceId}
      format={(adFormat as MediaFormatType) || 'auto'}
      aspectRatio={aspectRatio}
      fitMode={defaultFitMode}
      posterUrl={posterUrl}
      title={title}
      autoPlay={autoPlay}
      muted={muted}
      className={className}
      isRtl={isRtl}
      showControls={showControls}
      maxHeight={maxHeight}
      onOpenReels={onOpenReels}
      onEnded={onEnded}
    />
  );
};
