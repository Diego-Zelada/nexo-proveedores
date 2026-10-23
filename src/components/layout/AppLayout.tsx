import type { ReactNode } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ChevronRight,
  CircleHelp,
  Layers3,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function Ayuda({ compacta = false }: { compacta?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={
            compacta
              ? 'size-9 p-0 text-slate-500'
              : 'w-full justify-start gap-3 text-slate-300 hover:bg-white/10 hover:text-white'
          }
          aria-label="Abrir guía rápida"
        >
          <CircleHelp className="size-4" />
          {!compacta && 'Guía rápida'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tu directorio, en un solo lugar</DialogTitle>
          <DialogDescription>Una guía rápida para empezar con Nexo.</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            Registra un proveedor con su nombre y NIT. Puedes completar los demás datos cuando los
            tengas.
          </li>
          <li>Busca por nombre, NIT o correo y filtra los registros según su estado.</li>
          <li>
            Abre el menú de un proveedor para editarlo, inactivarlo o volverlo a activar. Los
            registros se conservan.
          </li>
        </ol>
        <div className="rounded-lg bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
          <strong>Sobre tus datos</strong>
          <p className="mt-1">
            Se guardan en este navegador y permanecen al actualizar la página. No se comparten entre
            dispositivos. Si borras los datos del sitio, perderás los registros guardados. El
            directorio inicial contiene ejemplos ficticios.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:p-3"
      >
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[218px] flex-col bg-[#17283e] px-5 py-8 xl:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-[#5e87ed]">
            <Layers3 className="size-6 text-white" />
          </div>
          <span className="text-[27px] font-semibold tracking-tight text-white">
            nexo<span className="text-[#7d9ff4]">.</span>
          </span>
        </div>
        <p className="mb-4 mt-12 px-3 text-[10px] font-semibold tracking-[.18em] text-slate-400">
          ESPACIO DE TRABAJO
        </p>
        <nav aria-label="Navegación principal">
          <a
            href="#contenido"
            aria-current="page"
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#2a3d59] px-3 py-3 text-sm font-medium text-white"
          >
            <Building2 className="size-[18px] text-[#94b1f9]" />
            Proveedores
            <span className="ml-auto size-1.5 rounded-full bg-[#8aaafa]" />
          </a>
        </nav>
        <div className="mt-auto">
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[.035] p-4">
            <BookOpen className="mb-3 size-5 text-[#a7bdf3]" />
            <p className="text-sm font-medium text-white">Cada contacto cuenta.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Mantén la información de tus proveedores al día.
            </p>
          </div>
          <Ayuda />
          <div className="mt-6 flex items-center gap-2 border-t border-white/10 px-2 pt-5 text-[11px] text-slate-400">
            <ShieldCheck className="size-3.5" />
            Gestión simple. Conexiones claras.
          </div>
        </div>
      </aside>
      <div className="xl:pl-[218px]">
        <header className="flex h-[76px] items-center justify-between gap-3 border-b bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-xl font-bold tracking-tight xl:hidden">
              nexo<span className="text-primary">.</span>
            </span>
            <span className="hidden text-slate-400 sm:inline">Espacio de trabajo</span>
            <ChevronRight className="hidden size-3.5 text-slate-300 sm:block" />
            <span className="hidden font-medium sm:inline">Proveedores</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 text-xs text-slate-500 md:flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Directorio de proveedores
            </div>
            <Ayuda compacta />
            <div
              className="flex size-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700"
              aria-label="Administración"
            >
              AD
            </div>
          </div>
        </header>
        <main
          id="contenido"
          className="mx-auto max-w-[1600px] px-4 pb-8 pt-7 sm:px-8 sm:pt-9 lg:px-10"
        >
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1600px] flex-col justify-between gap-2 px-5 pb-6 text-[11px] text-slate-400 sm:flex-row sm:px-8 lg:px-10">
          <span>Nexo · Administración de proveedores</span>
          <span className="flex items-center gap-1">
            Información organizada, mejores conexiones <ArrowUpRight className="size-3" />
          </span>
        </footer>
      </div>
    </div>
  )
}
