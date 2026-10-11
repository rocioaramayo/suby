import { PasswordChangeScreen } from '@/components/password-change-screen';

export default function CreatePassword() {
  return (
    <PasswordChangeScreen
      title="¡Tu cuenta fue aprobada!"
      subtitle="Crea tu contraseña para ingresar a la app."
      toastMessage="Contraseña creada exitosamente"
      successRoute="/login"
      buttonLabel="Restablecer contraseña"
    />
  );
}
