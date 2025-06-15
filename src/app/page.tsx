export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Hero Section */}
      <section className="bg-blue-50 py-20 text-center">
        <h1 className="text-5xl font-bold mb-4">🏡 Arunothai Garden Home</h1>
        <p className="text-lg text-gray-600 mb-6">Modern, clean, and peaceful apartments in Thailand</p>
        <a
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Login to your account
        </a>
      </section>

      {/* About Section */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Why choose Arunothai Garden Home?</h2>
        <p className="text-gray-700">
          We provide comfortable, well-maintained apartments perfect for professionals, students, and families.
          With easy access to shops, transport, and a peaceful atmosphere, Arunothai is your home away from home.
        </p>
      </section>

      {/* Features */}
      <section className="bg-gray-100 py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="text-xl font-semibold mb-2">🛏️ Clean Rooms</h3>
            <p className="text-gray-600">Well-maintained units with private bathrooms and balconies.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">🌳 Peaceful Area</h3>
            <p className="text-gray-600">Quiet, secure, and surrounded by nature for your peace of mind.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">📶 Free Wi-Fi</h3>
            <p className="text-gray-600">Fast and reliable internet access in all rooms.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Manage your apartment with ease</h2>
        <p className="mb-6 text-gray-700">Log in to your admin dashboard to manage apartments and rentees.</p>
        <a
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Go to Dashboard
        </a>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 text-center text-sm">
        &copy; {new Date().getFullYear()} Arunothai Garden Home. All rights reserved.
      </footer>
    </div>
  );
}
