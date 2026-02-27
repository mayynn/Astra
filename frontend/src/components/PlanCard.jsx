import { 
  Zap, Database, Cpu, HardDrive, 
  Check, Star
} from "lucide-react"

export default function PlanCard({ plan, isSelected, onClick, icon: IconComponent }) {
  const isPremium = plan.real_cost > 0 || (plan.coins && plan.coins >= 100)
  const isPopular = plan.name?.toLowerCase().includes("premium") || plan.coins >= 50
  
  return (
    <div 
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-300 h-full ${
        isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-medium">
            <Star className="h-3 w-3" />
            Popular
          </div>
        </div>
      )}

      <div className={`h-full rounded-xl p-6 border transition-all ${
        isSelected 
          ? "bg-dark-800 border-primary-500 shadow-lg shadow-primary-500/20" 
          : "bg-dark-800 border-white/10 hover:border-white/20"
      }`}>
        
        {/* Plan Name */}
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-white mb-2">
            {plan.name}
          </h3>
          {plan.description && (
            <p className="text-sm text-slate-400 line-clamp-2">
              {plan.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">
              {plan.real_cost > 0 ? `₹${plan.real_cost}` : (plan.coins ? `${plan.coins}` : "Free")}
            </span>
            {plan.coins > 0 && <span className="text-lg text-slate-400">coins</span>}
          </div>
          {plan.duration && (
            <p className="text-sm text-slate-400 mt-1">per {plan.duration}</p>
          )}
        </div>

        {/* Specs */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Cpu className="h-4 w-4 text-primary-400" />
            <span className="text-slate-300">CPU: <span className="text-white font-medium">{plan.cpu}%</span></span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Database className="h-4 w-4 text-primary-400" />
            <span className="text-slate-300">RAM: <span className="text-white font-medium">{plan.ram || "0MB"}</span></span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <HardDrive className="h-4 w-4 text-primary-400" />
            <span className="text-slate-300">Storage: <span className="text-white font-medium">{plan.disk || plan.storage || "0MB"}</span></span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onClick}
          disabled={plan.status === "out_of_stock"}
          className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
            plan.status === "out_of_stock"
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : isSelected
              ? "bg-primary-500 text-white hover:bg-primary-600"
              : "bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20"
          }`}
        >
          {plan.status === "out_of_stock" ? "Out of stock" : isSelected ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              Selected
            </span>
          ) : "Select plan"}
        </button>
      </div>
    </div>
  )
}
