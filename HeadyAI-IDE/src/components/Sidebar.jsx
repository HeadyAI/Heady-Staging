// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: HeadyAI-IDE/src/components/Sidebar.jsx                   ║
// ║  LAYER: frontend/src/components                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

import React from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const Sidebar = ({ isOpen, onToggle, children }) => {
  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 280 : 60 }}
      className="sidebar"
    >
      <div className="sidebar-header">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="toggle-btn"
          onClick={onToggle}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </motion.button>
      </div>
      
      <motion.div
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        className="sidebar-content-wrapper"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default Sidebar;
