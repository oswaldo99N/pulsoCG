# Publicar actualizaciones de Pulso CG

Repositorio: https://github.com/oswaldo99N/pulsoCG

La versión 2.2.0 añade el actualizador. Quien tenga 2.1.1 o anterior necesita
instalar una vez la primera versión 2.2.0 publicada. Desde esa versión la app
consulta GitHub Releases al abrirse y cada seis horas. También hay un botón
**Actualizaciones** y **Ayuda → Buscar actualizaciones**.

La app avisa, descarga al pulsar el botón y pide confirmación para reiniciar.
No instala al cerrar la app ni reinicia por su cuenta. Impide instalar si hay
gráficos al aire, borradores sin guardar o una instancia externa del servidor.
Los perfiles y logos permanecen en la carpeta de datos del sistema.

## Una sola vez: configurar firma de Mac

En GitHub abre:
https://github.com/oswaldo99N/pulsoCG/settings/secrets/actions

Pulsa **New repository secret** para añadir los siguientes datos. No los pongas
en el código ni los envíes por chat.

| Secret | Valor |
| --- | --- |
| `MAC_CSC_LINK` | Certificado **Developer ID Application** y su clave privada, exportados a `.p12`, codificado en base64 |
| `MAC_CSC_KEY_PASSWORD` | Contraseña del archivo `.p12` |
| `APPLE_ID` | Correo de la cuenta Apple Developer para notarización |
| `APPLE_APP_SPECIFIC_PASSWORD` | Contraseña específica de aplicación generada en la cuenta Apple, para notarización |
| `APPLE_TEAM_ID` | Team ID del equipo de Apple Developer |

El certificado **Apple Development** no sirve para esta distribución. En
Acceso a Llaveros → Mis certificados, elige **Developer ID Application**, que
debe incluir su clave privada, y expórtalo como `.p12` con contraseña. Si no lo
tienes aún, créalo desde Certificates del portal Apple Developer.

Para copiar el archivo como base64 desde el Mac, usa una terminal local:

```sh
base64 -i '/ruta/a/Developer-ID.p12' | pbcopy
```

Pega ese contenido solo en el secret `MAC_CSC_LINK`. El certificado y la
contraseña se usan únicamente en el runner Mac; no se incluyen en la app.
El flujo exige firma de distribución y notarización: si faltan o son
incorrectas, no publica una actualización incompleta.

Windows utiliza NSIS para descargar y actualizar. Actualmente los instaladores
Windows no tienen un certificado de firma de código comercial; Windows puede
mostrar un aviso de editor desconocido. La comprobación de integridad de las
descargas sigue activa.

## Publicar la primera versión

1. Configura los cinco secrets anteriores.
2. Abre https://github.com/oswaldo99N/pulsoCG/actions
3. Elige **Publicar actualización → Run workflow → main → Run workflow**.
4. Espera a que terminen los tests y las compilaciones de Windows y Mac.
5. Aparecerá **Pulso CG 2.2.0** en Releases con los DMG, ZIP, EXE y metadatos.
6. Instala esa versión una vez en cada computadora que deba actualizarse.

GitHub publica el release solo después de subir todos los instaladores y
metadatos. No hace falta comprimir ni pasar archivos de forma manual. No
incluyas copias de perfiles o logos privados en los releases públicos.

## Publicar las siguientes versiones

Después de guardar y comprobar los cambios:

```sh
npm test
git add .
git commit -m "Descripción del cambio"
npm version patch
git push origin main --follow-tags
```

`npm version patch` sube, por ejemplo, de 2.2.0 a 2.2.1 y crea su tag. Ese tag
activa el flujo de publicación. Para cambios mayores usa `minor` o `major`.
No reutilices un número de versión que ya se publicó.

## Qué instala el flujo

- Mac Apple Silicon: DMG y ZIP de arquitectura arm64, firmados y notarizados.
- Mac Intel: DMG y ZIP de arquitectura x64, firmados y notarizados.
- Windows: instalador NSIS x64 y su blockmap.
- `latest.yml` y `latest-mac.yml`: metadatos para que la app descubra la versión
  correcta y verifique las descargas. No los edites a mano.

El repositorio de distribución es público. No se incrustan tokens de GitHub en
la aplicación. Los datos locales, certificados y archivos `.env` están excluidos
del repositorio mediante `.gitignore`.

En builds de desarrollo o Mac con firma local ad hoc, la app no intentará una
instalación automática de Mac. Ofrecerá aviso y descarga manual hasta instalar
una versión distribuida con Developer ID.
