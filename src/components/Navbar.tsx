// This file is being removed as part of V1 cleanup
// We'll reimplement a Navbar in a future version if needed

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className='bg-white dark:bg-gray-800 shadow-md'>
      <div className='container mx-auto px-4'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex items-center'>
            <Link href='/' className='flex items-center'>
              <span className='text-xl font-bold text-gray-800 dark:text-white'>
                3D Chess with LLMs
              </span>
            </Link>
          </div>

          <div className='hidden md:block'>
            <div className='ml-10 flex items-center space-x-4'>
              <Link
                href='/'
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/")
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Home
              </Link>

              <Link
                href='/play'
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/play")
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Play Chess
              </Link>

              <Link
                href='/learn'
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/learn")
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Learn
              </Link>

              <Link
                href='/credits'
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/credits")
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Buy Credits
              </Link>
            </div>
          </div>

          <div className='md:hidden'>
            <button className='text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md'>
              <svg
                className='h-6 w-6'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 6h16M4 12h16M4 18h16'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
