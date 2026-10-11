import { PasswordChangeScreen } from '@/components/password-change-screen';

export default function FirstLoginChangePasswordScreen() {
  return (
    <PasswordChangeScreen
      title="Cambiá tu contraseña"
      subtitle="Ingresaste con una contraseña temporal. Antes de continuar, elegí una nueva para tu cuenta."
      toastMessage="Contraseña actualizada exitosamente"
      successRoute="/(tabs)"
      buttonLabel="Restablecer contraseña"
    />
  );
}
