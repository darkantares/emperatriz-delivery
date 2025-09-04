import { SocketEventType, socketService } from './websocketService';

class ExternalServiceHandler {
  
  constructor() {
    // Suscribirse a los eventos de WebSocket cuando se crea el servicio
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    // Escuchar el evento DRIVER_ASSIGNED
    socketService.on(SocketEventType.DRIVER_ASSIGNED, this.handleDriverAssigned.bind(this));
    
    // Escuchar el evento DELIVERY_UPDATED
    socketService.on(SocketEventType.DELIVERY_UPDATED, this.handleDeliveryUpdated.bind(this));
    
    // Escuchar el evento DELIVERY_STATUS_CHANGED
    socketService.on(SocketEventType.DELIVERY_STATUS_CHANGED, this.handleStatusChanged.bind(this));
  }

  // Método que se ejecuta cuando se asigna un conductor a una entrega
  handleDriverAssigned(data: any) {
    console.log('ExternalService: Procesando nueva asignación de conductor', data);
    // Aquí puedes implementar la lógica específica para manejar este evento
    // Por ejemplo, actualizar el estado global, mostrar una alerta personalizada, etc.
  }

  // Método que se ejecuta cuando se actualiza una entrega
  handleDeliveryUpdated(data: any) {
    console.log('ExternalService: Procesando actualización de entrega', data);
    // Implementa tu lógica específica aquí
  }

  // Método que se ejecuta cuando cambia el estado de una entrega
  handleStatusChanged(data: any) {
    console.log('ExternalService: Procesando cambio de estado', data);
    // Implementa tu lógica específica aquí
    
    // Ejemplo: Actualizar una lista local de entregas
    this.updateLocalDeliveryStatus(data.deliveryId, data.destiny.deliveryStatus);
  }

  // Ejemplo de método para actualizar el estado de una entrega localmente
  updateLocalDeliveryStatus(deliveryId: number, newStatus: string) {
    console.log(`Actualizando entrega #${deliveryId} a estado: ${newStatus}`);
    // Aquí podrías:
    // 1. Actualizar un estado global (Redux, Context, etc.)
    // 2. Guardar en AsyncStorage
    // 3. Realizar otras operaciones que necesites
  }

  // Método para limpiar los listeners cuando ya no se necesiten
  cleanup() {
    socketService.off(SocketEventType.DRIVER_ASSIGNED, this.handleDriverAssigned.bind(this));
    socketService.off(SocketEventType.DELIVERY_UPDATED, this.handleDeliveryUpdated.bind(this));
    socketService.off(SocketEventType.DELIVERY_STATUS_CHANGED, this.handleStatusChanged.bind(this));
  }
}

// Crear una instancia única para toda la aplicación
export const externalServiceHandler = new ExternalServiceHandler();
