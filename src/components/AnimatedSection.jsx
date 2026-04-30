import { motion as Motion } from 'framer-motion';

export const AnimatedSection = ({ children, className, delay = 0 }) => {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.6, 
        delay, 
        ease: [0.22, 1, 0.36, 1] 
      }}
      className={className}
    >
      {children}
    </Motion.div>
  );
};

export const ParallaxElement = ({ children, speed = 0.5, className }) => {
  return (
    <Motion.div
      style={{ y: 0 }}
      animate={{ y: [0, speed * 20, 0] }}
      transition={{ 
        duration: 4, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className={className}
    >
      {children}
    </Motion.div>
  );
};
