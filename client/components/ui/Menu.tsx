import type { ReactNode } from 'react';

interface MenuProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Menu({ children, className, id }: MenuProps) {
  const classes = ['user-menu', 'glass-surface'];
  if (className) {
    classes.push(className);
  }
  return (
    <div id={id} className={classes.join(' ')}>
      {children}
    </div>
  );
}
