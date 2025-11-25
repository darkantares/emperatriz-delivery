import { Linking, Platform, Alert } from 'react-native'

// export async function openWhatsAppMessage(phone: string, text: string = ''): Promise<boolean> {
//   const digits = (phone || '').replace(/\D/g, '')
//   const encoded = encodeURIComponent(text || '')
  
//   // Diferentes esquemas para probar
//   const schemes = [
//     `whatsapp://send?phone=${digits}${encoded ? `&text=${encoded}` : ''}`,
//     `whatsapp://api.whatsapp.com/send?phone=${digits}${encoded ? `&text=${encoded}` : ''}`,
//   ]
  
//   const webUrl = `https://wa.me/${digits}${encoded ? `?text=${encoded}` : ''}`

//   for (const scheme of schemes) {
//     try {
//       const canOpen = await Linking.canOpenURL(scheme)
//       if (canOpen) {
//         await Linking.openURL(scheme)
//         return true
//       }
//     } catch (error) {
//       console.warn(`No se pudo abrir con esquema: ${scheme}`, error)
//     }
//   }

//   // Si ningún esquema funciona, abrir web
//   try {
//     await Linking.openURL(webUrl)
//     return false
//   } catch (error) {
//     console.error('No se pudo abrir WhatsApp:', error)
//     Alert.alert('Error', 'No se pudo abrir WhatsApp')
//     return false
//   }
// }

export const openWhatsAppMessage = async (
    phoneNumber: string, 
    message: string = ''
  ): Promise<boolean> => {
    try {
      // Formatear el número de teléfono (eliminar espacios, guiones, etc.)
      const formattedNumber = phoneNumber.replace(/[\s-]/g, '');
      
      // Codificar el mensaje para URL
      const encodedMessage = encodeURIComponent(message);
      
      // Crear la URL de WhatsApp
      const whatsappUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodedMessage}`;
      
      // Verificar si WhatsApp está instalado y puede abrirse
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        // Intentar abrir WhatsApp Web como alternativa
        const webWhatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
        await Linking.openURL(webWhatsappUrl);
        return true;
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  };