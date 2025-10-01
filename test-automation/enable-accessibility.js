/**
 * Script Appium pour activer automatiquement l'accessibilité
 * après installation de l'APK de tracking
 */

const { remote } = require('webdriverio');

const TRACKING_APP_PACKAGE = 'com.bascule.leclerctracking';
const TRACKING_SERVICE_NAME = 'Bascule Cross-App Tracking';

async function enableAccessibility() {
    console.log('🚀 Démarrage du script d\'activation accessibilité...\n');

    const opts = {
        path: '/wd/hub',
        port: 4723,
        capabilities: {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:deviceName': 'Android Emulator',
            'appium:noReset': true,
            'appium:fullReset': false
        }
    };

    let driver;

    try {
        console.log('📱 Connexion à l\'émulateur...');
        driver = await remote(opts);
        
        console.log('⚙️ Ouverture des paramètres Android...');
        await driver.execute('mobile: shell', {
            command: 'am',
            args: ['start', '-a', 'android.settings.ACCESSIBILITY_SETTINGS']
        });
        
        await driver.pause(2000); // Attendre que les paramètres s'ouvrent
        
        console.log('🔍 Recherche du service d\'accessibilité...');
        
        // Chercher le service par texte
        const serviceSelector = `android=new UiSelector().textContains("${TRACKING_SERVICE_NAME}")`;
        
        try {
            const serviceElement = await driver.$(serviceSelector);
            
            if (await serviceElement.isExisting()) {
                console.log('✅ Service trouvé, clic pour ouvrir...');
                await serviceElement.click();
                await driver.pause(1000);
                
                // Chercher le switch pour activer
                const switchSelector = 'android=new UiSelector().className("android.widget.Switch")';
                const switchElement = await driver.$(switchSelector);
                
                if (await switchElement.isExisting()) {
                    const isEnabled = await switchElement.getAttribute('checked');
                    
                    if (isEnabled === 'false') {
                        console.log('🔄 Activation du service...');
                        await switchElement.click();
                        await driver.pause(1000);
                        
                        // Confirmer dans la popup si elle apparaît
                        try {
                            const okButton = await driver.$('android=new UiSelector().text("OK")');
                            if (await okButton.isExisting()) {
                                await okButton.click();
                                console.log('✅ Confirmation OK cliquée');
                            }
                        } catch (e) {
                            // Pas de popup, c'est ok
                        }
                        
                        console.log('✅ Service d\'accessibilité activé avec succès!');
                    } else {
                        console.log('ℹ️ Service déjà activé');
                    }
                } else {
                    console.log('⚠️ Switch non trouvé');
                }
            } else {
                console.log('❌ Service non trouvé dans la liste');
                console.log('💡 Vérifie que l\'APK est bien installé');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la recherche du service:', error.message);
        }
        
        // Retour à l'écran d'accueil
        console.log('🏠 Retour à l\'écran d\'accueil...');
        await driver.execute('mobile: shell', {
            command: 'input',
            args: ['keyevent', 'KEYCODE_HOME']
        });
        
        await driver.pause(1000);
        
        console.log('\n✅ Script terminé avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        if (driver) {
            await driver.deleteSession();
        }
    }
}

// Exécuter le script
if (require.main === module) {
    enableAccessibility()
        .then(() => {
            console.log('\n🎉 Accessibilité activée!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Échec:', error);
            process.exit(1);
        });
}

module.exports = { enableAccessibility };
