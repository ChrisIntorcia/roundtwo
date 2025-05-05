import React from 'react';
import Header from '@/components/Header';
import NavigationBar from '@/components/NavigationBar';
import StreamCard from '@/components/StreamCard';
import DailyDrops from '@/components/DailyDrops';
import ProductCard from '@/components/ProductCard';

const Index = () => {
  const featuredStream = {
    id: 1,
    imageUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=800&h=450",
    username: "GameMaster123",
    title: "Final boss challenge - Day 3!",
    viewerCount: 1245,
    isLive: true,
  };

  const products = [
    {
      id: 1,
      imageUrl: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=500&h=280",
      name: "Gaming Headset Pro",
      price: "$129.99",
      brand: "TechGear"
    },
    {
      id: 2,
      imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=500&h=280",
      name: "RGB Mechanical Keyboard",
      price: "$89.99",
      brand: "GamerZone"
    },
    {
      id: 3,
      imageUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=500&h=280",
      name: "Ergonomic Gaming Mouse",
      price: "$59.99",
      brand: "TechGear"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="app-container">
        {/* Featured Stream Section */}
        <section className="mt-4 px-4">
          <h2 className="text-lg font-semibold mb-3">Featured Stream</h2>
          <StreamCard
            imageUrl={featuredStream.imageUrl}
            username={featuredStream.username}
            title={featuredStream.title}
            viewerCount={featuredStream.viewerCount}
            isLive={featuredStream.isLive}
          />
        </section>

        {/* Daily Drops Section */}
        <section className="mt-6">
          <DailyDrops />
        </section>

        {/* Products Section */}
        <section className="mt-6 px-4 pb-16">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Products</h2>
            <button className="text-sm font-medium text-stream-purple">See all</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {products.map(product => (
              <ProductCard
                key={product.id}
                imageUrl={product.imageUrl}
                name={product.name}
                price={product.price}
                brand={product.brand}
              />
            ))}
          </div>
        </section>
      </main>

      <NavigationBar />
    </div>
  );
};

export default Index;
