import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, SignIn, useAuth, CreateOrganization, useOrganization, useOrganizationList } from '@clerk/clerk-react'
import { fetchWorkspaces } from '../features/workspaceSlice'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()
    const { organization } = useOrganization()
    const { isLoaded: orgListLoaded, setActive, userMemberships } = useOrganizationList()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Initial load of workspaces - only once
    useEffect(() => {
        if (isLoaded && user && !hasInitialized) {
            setHasInitialized(true)
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [isLoaded, user, hasInitialized, dispatch, getToken])

    // Set organization if needed
    useEffect(() => {
        if (!orgListLoaded || organization) return
        const firstOrg = userMemberships?.data?.[0]?.organization
        if (firstOrg) {
            setActive({ organization: firstOrg.id }).catch(() => {})
        }
    }, [orgListLoaded, organization, userMemberships?.data, setActive])

    if (!user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

    if (loading && workspaces.length > 0) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    const hasOrgMembership = Boolean(organization) || (orgListLoaded && (userMemberships?.data?.length || 0) > 0)
    if (user && !hasOrgMembership) {
        return (
            <div className='min-h-screen flex justify-center items-center'>
                <CreateOrganization routing="hash" afterCreateOrganizationUrl="/" />
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
