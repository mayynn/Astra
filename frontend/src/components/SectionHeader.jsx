export default function SectionHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/5 relative">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="h-12 w-12 rounded-xl bg-ink-900/40 border border-white/5 flex items-center justify-center text-slate-500 shadow-xl group-hover:text-neon-400 transition-colors">
            <Icon size={24} />
          </div>
        )}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            {title}
            <span className="h-2 w-2 rounded-full bg-neon-500 shadow-glow animate-pulse" />
          </h2>
          {subtitle && (
            <p className="text-sm font-medium text-slate-500 max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {action && (
        <div className="flex-shrink-0 animate-fade-in-up">
          {action}
        </div>
      )}

      {/* Futuristic accent line */}
      <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-neon-500 shadow-glow" />
    </div>
  )
}
