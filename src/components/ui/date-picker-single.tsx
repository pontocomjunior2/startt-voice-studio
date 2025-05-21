import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerSingleProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePickerSingle({
  label,
  date,
  onDateChange,
  placeholder = "Selecione a data",
  className,
}: DatePickerSingleProps) {
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `.rdp-head { display: none !important; }`;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={cn("grid gap-2", className)}>
      {label && <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full min-w-[150px] max-w-xs justify-start text-left font-normal rounded-lg border border-input bg-background shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/50",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: ptBR }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 rounded-xl shadow-lg border border-muted bg-background" align="start" sideOffset={8}>
          <Calendar
            initialFocus
            mode="single"
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={1}
            locale={ptBR}
            showOutsideDays={false}
            className="mx-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 