/**
 * Script Appium pour redémarrer le service d'accessibilité
 * Désactive puis réactive automatiquement
 */

const { remote } = require('webdriverio');

const TRACKING_APP_PACKAGE = 'com.bascule.leclerctracking';
const TRACKING_SERVICE_NAME = 'Bascule Cross-App Tracking';

async function restartAccessibility() {
    console.log('🔄 Redémarrage du service d\'accessibilité...\n');

    const opts = {
        path: '/',
        port: 4723,
        capabilities: {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:deviceName': 'emulator-5554',
            'appium:udid': 'emulator-5554',
            'appium:noReset': true,
            'appium:fullReset': false,
            'appium:newCommandTimeout': 300
        }
    };

    let driver;

    try {
        console.log('📱 Connexion à l\'émulateur...');
        driver = await remote(opts);
        
        console.log('⚙️ Ouverture des paramètres d\'accessibilité...');
        await driver.execute('mobile: shell', {
            command: 'am',
            args: ['start', '-a', 'android.settings.ACCESSIBILITY_SETTINGS']
        });
        
        await driver.pause(2000);
        
        console.log('🔍 Recherche du service...');
        console.log(`   Sélecteur: textContains("${TRACKING_SERVICE_NAME}")`);
        
        const serviceSelector = `android=new UiSelector().textContains("${TRACKING_SERVICE_NAME}")`;
        
        const serviceElement = await driver.$(serviceSelector);
        const exists = await serviceElement.isExisting();
        console.log(`   Service trouvé: ${exists}`);
        
        if (exists) {
            console.log('✅ Service trouvé, ouverture...');
            await serviceElement.click();
            await driver.pause(1500);
            
            // Chercher le switch
            const switchSelector = 'android=new UiSelector().className("android.widget.Switch")';
            const switchElement = await driver.$(switchSelector);
            
            if (await switchElement.isExisting()) {
                const isEnabled = await switchElement.getAttribute('checked');
                
                if (isEnabled === 'true') {
                    console.log('🔴 Désactivation du service...');
                    await switchElement.click();
                    await driver.pause(1000);
                    
                    // Confirmer désactivation si popup
                    try {
                        const okButton = await driver.$('android=new UiSelector().text("OK")');
                        if (await okButton.isExisting()) {
                            await okButton.click();
                            console.log('✅ Désactivation confirmée');
                        }
                    } catch (e) {
                        // Pas de popup
                    }
                    
                    await driver.pause(1000);
                    
                    console.log('🟢 Réactivation du service...');
                    await switchElement.click();
                    await driver.pause(1000);
                    
                    // Confirmer réactivation si popup
                    try {
                        const okButton = await driver.$('android=new UiSelector().text("OK")');
                        if (await okButton.isExisting()) {
                            await okButton.click();
                            console.log('✅ Réactivation confirmée');
                        }
                    } catch (e) {
                        // Pas de popup
                    }
                    
                    console.log('✅ Service redémarré avec succès!');
                } else {
                    console.log('⚠️ Service déjà désactivé, activation...');
                    await switchElement.click();
                    await driver.pause(1000);
                    
                    try {
                        const okButton = await driver.$('android=new UiSelector().text("OK")');
                        if (await okButton.isExisting()) {
                            await okButton.click();
                        }
                    } catch (e) {}
                    
                    console.log('✅ Service activé!');
                }
            } else {
                console.log('⚠️ Switch non trouvé');
            }
        } else {
            console.log('❌ Service non trouvé');
        }
        
        // Retour à l'écran d'accueil
        console.log('🏠 Retour à l\'écran d\'accueil...');
        await driver.execute('mobile: shell', {
            command: 'input',
            args: ['keyevent', 'KEYCODE_HOME']
        });
        
        await driver.pause(1000);
        
        console.log('\n✅ Redémarrage terminé!');
        
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
    restartAccessibility()
        .then(() => {
            console.log('\n🎉 Service d\'accessibilité redémarré!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Échec:', error);
            process.exit(1);
        });
}

module.exports = { restartAccessibility };
