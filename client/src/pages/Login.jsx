import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../firebase/auth'
import { storageService } from '../lib/storageService'
import useAuthStore from '../store/useAuthStore'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isMisconfigured, setIsMisconfigured] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()
    const { setUser } = useAuthStore()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)
        setIsMisconfigured(false)
        
        try {
            await loginUser(email, password)
            navigate('/dashboard')
        } catch (err) {
            if (err.message === 'FIREBASE_MISCONFIGURED') {
                setError('Identity Service (Firebase) is not enabled or configured correctly in your Google Console.')
                setIsMisconfigured(true)
            } else {
                setError(err.message || 'Failed to authenticate clearance')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleLocalLogin = async () => {
        setIsLoading(true)
        setError('')
        try {
            // Attempt to get or create user in our own backend/local store directly 
            // bypassing Firebase Auth since it is misconfigured
            const data = await storageService.getUser(email)
            if (data.user) {
                setUser({ email, isLocalOnly: true }, data.user, data.source, data.storageMode)
                navigate('/dashboard')
            } else {
                // If user doesn't exist, create a temporary local one
                const createData = await storageService.saveUser({ email, name: email.split('@')[0] })
                setUser({ email, isLocalOnly: true }, createData.user, createData.source, createData.storageMode)
                navigate('/dashboard')
            }
        } catch (err) {
            setError('Local database access failed: ' + (err.message || 'Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="glass-card p-8 rounded-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center mb-2 text-white">Access Lab</h2>
                <p className="text-gray-400 text-sm text-center mb-6">Enter your clearance credentials</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm text-center animate-pulse">
                        {error}
                    </div>
                )}

                <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Email</label>
                        <input
                            type="email"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                            placeholder="scientist@c-lab.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    {!isMisconfigured ? (
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-4 px-6 py-4 rounded-xl font-bold bg-neon-blue text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] active:scale-95 transition-all disabled:opacity-50">
                            {isLoading ? 'Authenticating...' : 'Standard Login'}
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 mt-2">
                            <button
                                type="button"
                                onClick={handleLocalLogin}
                                disabled={isLoading}
                                className="px-6 py-4 rounded-xl font-bold bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 transition-all">
                                Use Local Clearance (Skip Google/Firebase)
                            </button>
                            <p className="text-[10px] text-gray-400 text-center italic">
                                Use this option if you are having issues with the Google Cloud configuration.
                            </p>
                        </div>
                    )}
                </form>
                
                <p className="mt-8 text-center text-gray-500 text-xs">
                    Don't have clearance? <Link to="/register" className="text-neon-blue hover:text-white transition-colors">Register Account</Link>
                </p>
            </div>
        </div>
    )
}
