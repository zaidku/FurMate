import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled': return 'status-scheduled';
      case 'confirmed': return 'status-confirmed';
      case 'checked_in': return 'status-checked-in animate-pulse-soft';
      case 'in_progress': return 'status-in-progress animate-pulse-soft';
      case 'ready_for_pickup': return 'status-ready-for-pickup animate-pulse-soft';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-scheduled';
    }
  };

  return (
    <Badge className={`${getStatusBadgeClass(status)} animate-in shadow-soft`}>
      {status?.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};