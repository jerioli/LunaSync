
import { Button } from '@/components/ui/button';

interface TimeSelectorProps {
  times: string[];
  onTimeSelect: (time: string) => void;
  disabled?: boolean;
}

export const TimeSelector = ({ times, onTimeSelect, disabled = false }: TimeSelectorProps) => {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {times.map((time) => (
        <Button 
          key={time} 
          variant="outline" 
          size="sm"
          className={`bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTimeSelect(time)}
          disabled={disabled}
        >
          {time}
        </Button>
      ))}
    </div>
  );
};
