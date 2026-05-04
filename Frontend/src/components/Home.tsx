import React, { useState } from "react";
import {
  Car,
  MapPin,
  Calendar,
  Shield,
  Zap,
  CreditCard,
  Search,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router-dom";

// Types
interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Stat {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string;
  rating: number;
}

const Home: React.FC = () => {
  const [searchLocation, setSearchLocation] = useState<string>("");

  const features: Feature[] = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Find Parking Instantly",
      description:
        "Search thousands of parking spots near your destination in real-time",
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Book in Advance",
      description:
        "Reserve your spot ahead of time and never worry about availability",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Safe",
      description: "24/7 monitored lots with CCTV and security personnel",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "EV Charging",
      description:
        "Charge your electric vehicle while you park at select locations",
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Flexible Payment",
      description:
        "Pay hourly, daily, or monthly with multiple payment options",
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile Access",
      description:
        "Manage bookings, extend time, and access lots from your phone",
    },
  ];

  const stats: Stat[] = [
    {
      value: "500+",
      label: "Parking Locations",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      value: "50K+",
      label: "Happy Customers",
      icon: <Users className="w-5 h-5" />,
    },
    {
      value: "200K+",
      label: "Bookings Made",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      value: "4.8/5",
      label: "Average Rating",
      icon: <Star className="w-5 h-5" />,
    },
  ];

  const testimonials: Testimonial[] = [
    {
      name: "Sarah Johnson",
      role: "Business Professional",
      content:
        "Parkify has made my daily commute so much easier. I can always find a spot near my office, and the monthly plan saves me money!",
      avatar: "SJ",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Frequent Traveler",
      content:
        "The airport parking is fantastic! I love being able to reserve my spot before my trip and the shuttle service is always on time.",
      avatar: "MC",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Urban Resident",
      content:
        "Living in the city, parking was always a nightmare. Parkify solved that problem. The app is super easy to use!",
      avatar: "ER",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}

      {/* Hero Section */}
      <section className="relative bg-linear  -to-br from-blue-50 via-white to-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-black rounded-full text-sm font-semibold mb-6">
                <TrendingUp className="w-4 h-4" />
                #1 Parking Solution
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Find & Book
                <br />
                <span className="text-green-600">Parking Spots</span>
                <br />
                Anywhere
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Skip the stress of finding parking. Book verified spots in
                advance, save money, and park with confidence at 500+ locations
                nationwide.
              </p>

              {/* Search Bar */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-3 px-4">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter location or address..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="flex-1 py-3 text-sm focus:outline-none"
                    />
                  </div>
                  <button className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-2">
                    Search
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {["BG", "AM", "KL", "PQ"].map((initials, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-linear-to-br from-gray-400 to-gray-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">
                      50K+ Users
                    </div>
                    <div className="text-gray-600">Trust Parkify</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">4.8/5</div>
                    <div className="text-gray-600">Rating</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="relative">
                <img
                  src="src/assets/home.jpg"
                  alt="Parking lot"
                  className="rounded-2xl shadow-2xl"
                />
                {/* Floating Stats Card */}
                <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl shadow-xl p-4 border border-gray-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-black">50+</div>
                      <div className="text-xs text-gray-600">Locations</div>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <div className="text-2xl font-bold text-green-600">
                        24/7
                      </div>
                      <div className="text-xs text-gray-600">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ₹30/hr
                      </div>
                      <div className="text-xs text-gray-600">Starting</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3 text-white">
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Parkify?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need for a seamless parking experience, all in one
              platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-black mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get parked in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  1
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-black mx-auto mb-4">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Search Location
                </h3>
                <p className="text-gray-600">
                  Enter your destination and browse available parking spots
                  nearby
                </p>
              </div>
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-300"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  2
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-black mx-auto mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Book Your Spot
                </h3>
                <p className="text-gray-600">
                  Select your dates and times, then reserve your parking spot
                  instantly
                </p>
              </div>
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-300"></div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-black mx-auto mb-4">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Park & Go
              </h3>
              <p className="text-gray-600">
                Use your digital pass to access the lot and enjoy hassle-free
                parking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      {/* <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the plan that works best for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-xl p-8 ${
                  plan.highlighted
                    ? 'bg-linear-to-br from-blue-600 to-blue-700 text-white shadow-2xl scale-105'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-block px-3 py-1 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full mb-4">
                    MOST POPULAR
                  </div>
                )}
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    plan.highlighted ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {plan.name}
                </h3>
                <div
                  className={`text-4xl font-bold mb-2 ${
                    plan.highlighted ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {plan.price}
                </div>
                <p
                  className={`mb-6 ${
                    plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                  }`}
                >
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check
                        className={`w-5 h-5 shrink-0 mt-0.5 ${
                          plan.highlighted ? 'text-blue-200' : 'text-green-600'
                        }`}
                      />
                      <span
                        className={plan.highlighted ? 'text-blue-50' : 'text-gray-700'}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-gray-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of happy parkers across the country
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {testimonial.content}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-linear-to-br from-gray-800 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Never Worry About Parking Again?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 50,000+ users who've already made parking effortless
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            <Link to={"login"}>
              <button className="px-8 py-4 bg-white text-gray-600 cursor-pointer font-bold rounded-lg hover:bg-transparent hover:text-white border-2 border-gray-700   hover:border-white transition-colors shadow-lg">
                Get Started Free
              </button>
            </Link>

            <Link
              to={"/parking-lots"}
            >
                <button className="px-8 py-4 bg-transparent border-2 cursor-pointer border-white text-white font-bold rounded-lg hover:bg-white  hover:text-gray-700 transition-colors">
                 View Locations
                 </button>
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
