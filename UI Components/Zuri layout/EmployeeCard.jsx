'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

/**
 * EmployeeCard component
 * Implements "The Silent Supporter" design system with glassmorphism and amber highlights.
 */
export default function EmployeeCard({ employee, variant = 'grid' }) {
  const { id, firstName, lastName, jobTitle, role, department, status, avatar } = employee;

  const getInitials = (fName, lName) => {
    return `${(fName || '')[0] || ''}${(lName || '')[0] || ''}`.toUpperCase() || 'E';
  };

  if (variant === 'carousel') {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative min-w-[280px] h-[360px] rounded-3xl overflow-hidden group cursor-pointer"
      >
        {/* Glass Background */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20" />
        
        {/* Content Container */}
        <div className="relative h-full p-6 flex flex-col items-center justify-end text-center bg-gradient-to-t from-black/40 to-transparent">
          {/* Avatar Area */}
          <div className="mb-auto mt-4">
             <div className="h-24 w-24 rounded-full bg-brand/20 border-2 border-brand/30 flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_30px_rgba(232,130,12,0.2)]">
               {getInitials(firstName, lastName)}
             </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white font-prompt">
              {firstName} {lastName}
            </h3>
            <p className="text-white/70 text-sm font-medium">
              {jobTitle || role}
            </p>
            <div className="inline-flex px-3 py-1 bg-brand text-white text-[10px] font-bold rounded-full tracking-wider uppercase">
              {department || 'GENERAL'}
            </div>
          </div>
          
          <Link href={`/employees/${id}`} className="absolute inset-0 z-10">
            <span className="sr-only">View {firstName}</span>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center hover:shadow-lg hover:border-brand/30 transition-shadow group relative overflow-hidden"
    >
      {/* Decorative Brand Dot */}
      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Avatar */}
      <div className="h-20 w-20 rounded-full bg-brand-surface text-brand flex items-center justify-center text-2xl font-bold mb-4 border border-brand-tint group-hover:bg-brand group-hover:text-white transition-colors">
        {getInitials(firstName, lastName)}
      </div>

      {/* Info */}
      <div className="space-y-1 mb-4">
        <h4 className="text-base font-bold text-gray-900 font-prompt">
          {firstName} {lastName}
        </h4>
        <p className="text-xs text-gray-500 font-medium">
          {jobTitle || role}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap justify-center gap-2 mt-auto">
        <span className="px-2.5 py-1 bg-rest-blue text-rest-blue-text text-[10px] font-bold rounded-full">
          {department || 'GEN'}
        </span>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
          status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {status}
        </span>
      </div>

      <Link href={`/employees/${id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View Profile</span>
      </Link>
    </motion.div>
  );
}
