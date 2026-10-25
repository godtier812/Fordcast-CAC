import { Link, router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, Page, Title, styles } from '@/components/fordcast/UI';
import { usePreferences } from '@/lib/preferences';
import { theme } from '@/lib/theme';

export default function Privacy() {
  const { language } = usePreferences();
  const es = language === 'es';
  const sections = es ? [
    ['Límites de uso', 'FordCast es un prototipo complementario del área de Austin. Respete las barricadas y los avisos oficiales. Nunca maneje hacia el agua. La investigación con sensores no valida la inundación del camino.'],
    ['En este dispositivo', 'El idioma, los cruces guardados, el reconocimiento del aviso y las preferencias se guardan localmente. El registro visible de alertas pertenece a la sesión. No se necesita una cuenta. Puede quitar cruces guardados y cambiar permisos en Ajustes.'],
    ['Solicitudes a otros servicios', 'Buscar direcciones envía el texto y coordenadas de referencia a Photon. Planear rutas envía el origen y destino a Valhalla. El mapa solicita teselas a proveedores externos, incluyendo Esri y OpenStreetMap. Las consultas de lluvia usan Open-Meteo. Las voces web pueden solicitar audio a Google. Esos servicios reciben datos de solicitud y la dirección de red.'],
    ['Ubicación y avisos', 'La ubicación requiere permiso del dispositivo. El monitoreo de fondo requiere una compilación compatible y permisos adicionales. Una pestaña web no ofrece monitoreo continuo cuando está inactiva. Cambie o revoque permisos desde el navegador o sistema operativo.'],
    ['Archivo y conectividad', 'Las tormentas archivadas son simulaciones identificadas. La geometría grabada de las rutas es solo para revisión cuando el servicio falla; no calcula un desvío actual. Las fuentes actuales y teselas pueden requerir conexión.'],
  ] : [
    ['Use and limits', 'FordCast is a supplementary Austin-area prototype. Obey barricades and official warnings. Never drive into water. Its gauge research does not validate road flooding.'],
    ['On this device', 'Language, saved crossings, notice acknowledgement and preferences are stored locally. The visible alert log belongs to the session. No account is required. Remove saved crossings and change permissions in Settings.'],
    ['Requests to other services', 'Address searches send search text and reference coordinates to Photon. Trip planning sends the origin and destination to Valhalla. The map requests tiles from external providers, including Esri and OpenStreetMap. Rain queries use Open-Meteo. Web voices may request audio from Google. Those services receive request data and your network address.'],
    ['Location and notifications', 'Location requires device permission. Background monitoring requires a compatible build and additional permissions. An inactive web tab does not provide continuous monitoring. Change or revoke permissions in your browser or operating system.'],
    ['Archives and connectivity', 'Archived storms are labelled simulations. Recorded trip geometry is review-only during a routing outage and does not calculate a current detour. Current sources and map tiles may still require a connection.'],
  ];
  return (
    <Page>
      <Button secondary title={es ? 'Volver a FordCast' : 'Return to FordCast'} onPress={() => router.replace('/')} />
      <Title>{es ? 'Datos, privacidad y límites' : 'Data, privacy and limits'}</Title>
      <AppText style={styles.footer}>{es ? 'Revisión: 24 de octubre de 2026' : 'Reviewed October 24, 2026'}</AppText>
      {sections.map(([title, body]) => (
        <View key={title} style={{ gap: 8 }}>
          <AppText style={styles.heading}>{title}</AppText>
          <AppText style={styles.muted}>{body}</AppText>
        </View>
      ))}
      <AppText style={styles.heading}>{es ? 'Fuentes y atribución' : 'Sources and attribution'}</AppText>
      {[
        ['ATXFloods', 'https://www.atxfloods.com/'],
        ['USGS Water Data', 'https://waterdata.usgs.gov/'],
        ['National Weather Service', 'https://www.weather.gov/'],
        ['NOAA Storm Events', 'https://www.ncdc.noaa.gov/stormevents/'],
        ['OpenStreetMap contributors', 'https://www.openstreetmap.org/copyright'],
        ['Valhalla', 'https://valhalla.github.io/valhalla/'],
      ].map(([label, url]) => (
        <Link key={url} href={url as `https://${string}`} style={{ color: theme.link, minHeight: 44, paddingVertical: 10, fontSize: 15 }}>{label}</Link>
      ))}
    </Page>
  );
}
