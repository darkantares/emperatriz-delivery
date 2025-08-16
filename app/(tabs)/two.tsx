import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function TabTwoScreen() {
  const { logout, user, roles } = useAuth();

  const handleLogout = async () => {
    await logout();
  };  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{flexGrow: 1}} style={{width: '100%'}}>
        <View style={styles.container}>
          <Text style={styles.welcomeText}>
            Bienvenido{user?.firstname ? `, ${user.firstname} ${user.lastname}` : user?.name ? `, ${user.name}` : ''}
          </Text>
          <Text style={styles.emailText}>{user?.email}</Text>
          
          {roles && roles.length > 0 && (
            <View style={styles.rolesContainer}>
              <Text style={styles.rolesTitle}>Tus Roles:</Text>
              {roles.map((role) => (
                <View key={role.id} style={styles.roleItem}>
                  <Text style={styles.roleText}>• {role.title}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.settingsContainer}>
            <Text style={styles.title}>Ajustes</Text>
            
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CustomColors.backgroundDarkest,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 30,
    backgroundColor: CustomColors.backgroundDarkest,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: CustomColors.textLight,
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: CustomColors.neutralLight,
    marginBottom: 20,
  },
  rolesContainer: {
    width: '90%',
    backgroundColor: CustomColors.backgroundMedium,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  rolesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.secondary,
    marginBottom: 10,
  },
  roleItem: {
    marginVertical: 4,
    backgroundColor: 'transparent',
  },
  roleText: {
    fontSize: 14,
    color: CustomColors.textLight,
  },
  settingsContainer: {
    width: '90%',
    backgroundColor: CustomColors.backgroundMedium,
    borderRadius: 12,
    padding: 20,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CustomColors.quaternary,
    marginBottom: 30,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoutButton: {
    backgroundColor: CustomColors.error,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 10,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
