import React, { useState } from 'react';

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContext = React.createContext<{
  value: string;
  setValue: (value: string) => void;
}>({
  value: '',
  setValue: () => {},
});

export function Tabs({ defaultValue = '', children, ...props }: TabsProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className = '', ...props }: TabsListProps) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-700 ${className}`}
      {...props}
    />
  );
}

export function TabsTrigger({ value, className = '', ...props }: TabsTriggerProps) {
  const { value: selectedValue, setValue } = React.useContext(TabsContext);
  const isActive = selectedValue === value;

  return (
    <button
      onClick={() => setValue(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      } ${className}`}
      {...props}
    />
  );
}

export function TabsContent({ value, className = '', ...props }: TabsContentProps) {
  const { value: selectedValue } = React.useContext(TabsContext);

  if (selectedValue !== value) return null;

  return (
    <div className={`mt-4 ${className}`} {...props} />
  );
}
