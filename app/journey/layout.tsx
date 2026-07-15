import CopilotPanel from '@/components/CopilotPanel'

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="flex-1 min-w-0">{children}</div>
      <CopilotPanel />
    </div>
  )
}
