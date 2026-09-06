import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { perplextaPageTransition } from '../constants/motions';

interface ContentContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '7xl';
}

export const ContentContainer: React.FC<ContentContainerProps> = ({
  children,
  spacing = 'lg',
  maxWidth = '5xl',
  className = '',
  ...props
}) => {
  const spacingClasses = {
    none: '',
    sm: 'space-y-2 md:space-y-4',
    md: 'space-y-4 md:space-y-6',
    lg: 'space-y-6 md:space-y-10',
  };

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '7xl': 'max-w-7xl',
  };

  return (
    <motion.div
      variants={perplextaPageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`mx-auto w-[92%] md:w-[85%] pt-4 sm:pt-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] lg:pb-16 ${maxWidthClasses[maxWidth]} ${spacingClasses[spacing]} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
export default ContentContainer;
