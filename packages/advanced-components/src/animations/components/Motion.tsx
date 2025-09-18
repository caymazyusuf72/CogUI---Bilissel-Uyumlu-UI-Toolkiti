import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseComponentProps, MotionProps } from '../../types';

export interface MotionComponentProps extends BaseComponentProps, MotionProps {
  as?: keyof JSX.IntrinsicElements;
  show?: boolean;
}

/**
 * Motion - Gelişmiş animasyon bileşeni
 * Framer Motion ile güçlendirilmiş
 */
export const Motion: React.FC<MotionComponentProps> = ({
  children,
  as = 'div',
  show = true,
  className,
  style,
  testId,
  initial,
  animate,
  exit,
  transition,
  variants,
  whileHover,
  whileTap,
  whileFocus,
  layout,
  layoutId,
  ...props
}) => {
  const Component = motion[as] as any;

  return (
    <AnimatePresence>
      {show && (
        <Component
          className={className}
          style={style}
          data-testid={testId}
          initial={initial}
          animate={animate}
          exit={exit}
          transition={transition}
          variants={variants}
          whileHover={whileHover}
          whileTap={whileTap}
          whileFocus={whileFocus}
          layout={layout}
          layoutId={layoutId}
          {...props}
        >
          {children}
        </Component>
      )}
    </AnimatePresence>
  );
};

export default Motion;