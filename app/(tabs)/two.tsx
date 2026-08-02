import { StyleSheet, Pressable, ScrollView } from 'react-native';
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
            
            <Pressable 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </Pressable>
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
    color: CustomColors.white,
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: CustomColors.neutralLight,
    marginBottom: 20,
  },
  rolesContainer: {
    width: '90%',
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: CustomColors.border,
  },
  rolesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.primary,
    marginBottom: 10,
  },
  roleItem: {
    marginVertical: 4,
    backgroundColor: 'transparent',
  },
  roleText: {
    fontSize: 14,
    color: CustomColors.white,
  },
  settingsContainer: {
    width: '90%',
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: CustomColors.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CustomColors.white,
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: CustomColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 10,
  },
  logoutText: {
    color: CustomColors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
