import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CourtFinder from "./pages/CourtFinder";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <main className="flex-1">
        <CourtFinder />
      </main>
      <Footer />
    </div>
  );
};

export default App;
