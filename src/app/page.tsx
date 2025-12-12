import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import QuickAccessGrid from "@/components/QuickAccessGrid";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative overflow-y-auto">

        {/* Top Bar */}
        <header className="p-4 flex justify-end items-center">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            U
          </div>
        </header>

        <div className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-12">

          {/* Hero Section with Search */}
          <section className="text-center space-y-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              こんにちは、ユーザーさん
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400">
              今日はどのようなお手伝いができますか？
            </p>


          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">クイックアクセス</h2>
            <QuickAccessGrid />
          </section>



        </div>
      </main>
    </div>
  );
}
