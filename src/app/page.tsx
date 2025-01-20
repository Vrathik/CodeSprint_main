// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, Leaf, Recycle, Users, Coins, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Poppins } from 'next/font/google'
import Link from 'next/link'
import ContractInteraction from '@/components/ContractInteraction'
import { getRecentReports, getAllRewards, getWasteCollectionTasks } from '@/utils/db/actions'
import Globe from "@/components/Globe"
import Image from 'next/image'
import Logo from "../../public/logo.png"

const poppins = Poppins({ 
  weight: ['300', '400', '600'],
  subsets: ['latin'],
  display: 'swap',
})

function AnimatedGlobe() {
  return (
    <div className="relative w-64 h-64 mx-auto mb-8 ml-6">
      <div className="absolute inset-0 rounded-full bg-green-500 opacity-20 animate-pulse"></div>
      <div className="absolute inset-2 rounded-full bg-green-400 opacity-40 animate-ping"></div>
      <div className="absolute inset-4 rounded-full bg-green-300 opacity-60 animate-spin"></div>
      <div className="absolute inset-6 rounded-full bg-green-200 opacity-80 animate-bounce"></div>
      <Image
        src={Logo}
        alt="Logo"
        className="absolute inset-0 m-auto h-32 w-32 animate-pulse"
      />
    </div>
  )
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [impactData, setImpactData] = useState({
    wasteCollected: 0,
    reportsSubmitted: 0,
    tokensEarned: 0,
    co2Offset: 0,
  })

  useEffect(() => {
    async function fetchImpactData() {
      try {
        const reports = await getRecentReports(100) || []
        const rewards = await getAllRewards() || []
        const tasks = await getWasteCollectionTasks(100) || []

        const wasteCollected = tasks.reduce((total, task) => {
          const match = task.amount.match(/(\d+(\.\d+)?)/)
          const amount = match ? parseFloat(match[0]) : 0
          return total + amount
        }, 0)

        const reportsSubmitted = reports.length
        const tokensEarned = rewards.reduce((total, reward) => total + (reward.points || 0), 0)
        const co2Offset = wasteCollected * 0.5

        setImpactData({
          wasteCollected: Math.round(wasteCollected * 10) / 10,
          reportsSubmitted,
          tokensEarned,
          co2Offset: Math.round(co2Offset * 10) / 10,
        })
      } catch (error) {
        console.error("Error fetching impact data:", error)
        setImpactData({
          wasteCollected: 0,
          reportsSubmitted: 0,
          tokensEarned: 0,
          co2Offset: 0,
        })
      }
    }

    fetchImpactData()
  }, [])

  const login = () => {
    setLoggedIn(true)
  }

  return (
    <div className={`container mr-64 mt-8  mx-auto px-4 py-16 ${poppins.className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 mb-20 mt-10 mr-48">
        <section className="flex flex-col justify-between mt-6">
          <AnimatedGlobe />
          <h1 className="text-6xl font-bold mb-6 text-gray-800 tracking-tight">
            SmartCycle <span className="text-green-600">Waste Management</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Smart Waste Management with IoT and AI for Sustainable Cities
          </p>
          {!loggedIn ? (
            <Button
              onClick={login}
              className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Link href="/report">
              <Button className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105">
                Report Waste
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </section>
        
        <section className="flex items-center justify-center">
          <div className="w-full h-[600px]">
            <Globe />
          </div>
        </section>
      </div>

      <section className="grid md:grid-cols-3 gap-28 mb-20 ml-14">
        <FeatureCard
          icon={Leaf}
          title="Eco-Friendly"
          description="Contribute to a cleaner environment by reporting and collecting waste."
        />
        <FeatureCard
          icon={Coins}
          title="Earn Rewards"
          description="Get tokens for your contributions to waste management efforts."
        />
        <FeatureCard
          icon={Users}
          title="Community-Driven"
          description="Be part of a growing community committed to sustainable practices."
        />
      </section>

      <section className="bg-white p-10 rounded-3xl shadow-lg mb-20">
        <h2 className="text-4xl font-bold mb-12 text-center text-gray-800">Our Impact</h2>
        <div className="grid md:grid-cols-4">
          <ImpactCard title="Waste Collected" value={`${impactData.wasteCollected} kg`} icon={Recycle} />
          <ImpactCard title="Reports Submitted" value={impactData.reportsSubmitted.toString()} icon={MapPin} />
          <ImpactCard title="Tokens Earned" value={impactData.tokensEarned.toString()} icon={Coins} />
          <ImpactCard title="CO2 Offset" value={`${impactData.co2Offset} kg`} icon={Leaf} />
        </div>
      </section>
    </div>
  )
}

function ImpactCard({ title, value, icon: Icon }) {
  const formattedValue =
    typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : value

  return (
    <div className="p-6 rounded-xl bg-gray-50 border border-gray-100 transition-all duration-300 ease-in-out hover:shadow-md">
      <Icon className="h-10 w-10 text-green-500 mb-4" />
      <p className="text-3xl font-bold mb-2 text-gray-800">{formattedValue}</p>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col items-center text-center transform hover:scale-105">
      <div className="bg-green-100 p-4 rounded-full mb-6 shadow-md transform transition-all duration-300 ease-in-out hover:scale-110">
        <Icon className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}