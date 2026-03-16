import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface Props {
  children: React.ReactNode;
}

export const Layout = ({ children }: Props) => (
  <div className="min-h-screen bg-gray-50">
    <Sidebar />
    <Header />
    <main className="ml-56 mt-14 p-6">
      {children}
    </main>
  </div>
);
