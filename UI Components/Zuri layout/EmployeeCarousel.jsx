'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useRef } from 'react';
import EmployeeCard from '../ui/EmployeeCard';

/**
 * EmployeeCarousel component
 * A premium draggable carousel for highlighting staff.
 */
export default function EmployeeCarousel({ employees }) {
  const containerRef = useRef(null);
  
  // Carousel entrance variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (!employees || employees.length === 0) return null;

  return (
    <div className="w-full py-8 overflow-hidden">
      <div className="flex items-center justify-between mb-6 px-4">
        <div>
          <h2 className="text-xl font-bold font-prompt text-gray-900 flex items-center gap-2">
            Featured Team Members
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          </h2>
          <p className="text-sm text-gray-500">Discover our talented staff members</p>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-brand">
          <span>DRAG TO EXPLORE</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </div>

      <motion.div
        ref={containerRef}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        drag="x"
        dragConstraints={{ left: -1000, right: 0 }} // Dynamic constraints would be better but this is a starting point
        className="flex gap-6 px-4 cursor-grab active:cursor-grabbing pb-4"
      >
        {employees.map((emp) => (
          <EmployeeCard key={emp.id} employee={emp} variant="carousel" />
        ))}
      </motion.div>
    </div>
  );
}
