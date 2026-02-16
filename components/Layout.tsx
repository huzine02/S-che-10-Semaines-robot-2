import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { BottomNav } from './BottomNav';

const { Outlet } = ReactRouterDOM;

export const Layout: React.FC = () => {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
};