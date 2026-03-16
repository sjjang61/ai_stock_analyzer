import clsx from "clsx";

interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, active, onChange, className }: Props) => (
  <div className={clsx("flex gap-1 bg-gray-100 p-1 rounded-lg", className)}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={clsx(
          "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
          active === tab.key
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
