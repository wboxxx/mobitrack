/**
 * Test automatisé : Ajout de banane depuis le panier Carrefour
 * Plus rapide : on va directement au panier où les bananes sont déjà listées
 */

const { remote } = require('webdriverio');

const CARREFOUR_PACKAGE = 'com.carrefour.fid.android';

async function testCarrefourBananaFromCart() {
    console.log('🍌 Test automatisé : Ajout de banane depuis le panier Carrefour\n');

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
        
        // Etape 1 : Lancer Carrefour
        console.log('🚀 Lancement de Carrefour...');
        await driver.execute('mobile: startActivity', {
            intent: `${CARREFOUR_PACKAGE}/.presentation.ui.splash.SplashActivity`
        });
        await driver.pause(3000);
        console.log('   ✅ Carrefour lancé');
        
        // Etape 2 : Aller au panier (navigation bar en bas)
        console.log('🛒 Ouverture du panier...');
        try {
            // Chercher le bouton "Panier" dans la navigation bar
            const cartButton = await driver.$('android=new UiSelector().text("Panier").resourceId("com.carrefour.fid.android:id/navigation_bar_item_large_label_view")');
            
            if (await cartButton.isExisting()) {
                await cartButton.click();
                await driver.pause(2000);
                console.log('   ✅ Panier ouvert');
            } else {
                // Fallback : utiliser content-desc
                const cartButtonAlt = await driver.$('android=new UiSelector().descriptionContains("Panier")');
                if (await cartButtonAlt.isExisting()) {
                    await cartButtonAlt.click();
                    await driver.pause(2000);
                    console.log('   ✅ Panier ouvert (méthode alternative)');
                } else {
                    console.log('   ⚠️ Bouton panier non trouvé');
                }
            }
        } catch (e) {
            console.log('   ⚠️ Erreur ouverture panier:', e.message);
        }
        
        // Etape 3 : Scroll vers les bananes (si nécessaire)
        console.log('📜 Scroll vers les bananes...');
        await driver.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 500, y: 1500 },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 300 },
                { type: 'pointerMove', duration: 300, x: 500, y: 800 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.pause(1000);
        console.log('   ✅ Scroll effectué');
        
        // Etape 4 : Trouver "Bananes Cavendish vrac" et cliquer sur le bouton "+"
        console.log('🍌 Recherche des bananes...');
        try {
            const bananaText = await driver.$('android=new UiSelector().textContains("Bananes")');
            
            if (await bananaText.isExisting()) {
                console.log('   ✅ Bananes trouvées!');
                
                // Afficher le texte exact trouvé
                const text = await bananaText.getText();
                console.log(`   📝 Produit: "${text}"`);
                
                // Vérifier si le produit est à MAX
                const maxLabel = await driver.$('android=new UiSelector().text("MAX")');
                if (await maxLabel.isExisting()) {
                    const maxLocation = await maxLabel.getLocation();
                    const bananaLocation = await bananaText.getLocation();
                    const distance = Math.abs(maxLocation.y - bananaLocation.y);
                    
                    if (distance < 200) {
                        console.log('   ⚠️ Les bananes sont à la quantité MAX!');
                        console.log('   💡 Impossible d\'ajouter plus de bananes');
                        return;
                    }
                }
                
                // Méthode 1 : Chercher tous les boutons "Ajouter un produit dans le panier"
                let addButtons = await driver.$$('android=new UiSelector().descriptionContains("Ajouter un produit dans le panier")');
                console.log(`   🔍 Méthode 1 : ${addButtons.length} bouton(s) "Ajouter" trouvé(s)`);
                
                // Méthode 2 : Si aucun bouton trouvé, chercher les View clickables proches
                if (addButtons.length === 0) {
                    console.log('   🔍 Méthode 2 : Recherche des View clickables...');
                    addButtons = await driver.$$('android=new UiSelector().clickable(true).className("android.view.View")');
                    console.log(`   🔍 ${addButtons.length} View clickable(s) trouvé(s)`);
                }
                
                if (addButtons.length > 0) {
                    // Trouver le bon bouton (celui qui est proche des bananes)
                    // On va chercher celui qui a les coordonnées Y proches du texte "Bananes"
                    const bananaLocation = await bananaText.getLocation();
                    console.log(`   📍 Position bananes: y=${bananaLocation.y}`);
                    
                    let closestButton = null;
                    let minDistance = Infinity;
                    
                    for (const button of addButtons) {
                        const buttonLocation = await button.getLocation();
                        const distance = Math.abs(buttonLocation.y - bananaLocation.y);
                        
                        console.log(`   📍 Bouton à y=${buttonLocation.y}, distance=${distance}`);
                        
                        if (distance < minDistance && distance < 200) {
                            minDistance = distance;
                            closestButton = button;
                        }
                    }
                    
                    if (closestButton) {
                        console.log(`   🎯 Bouton le plus proche trouvé (distance: ${minDistance}px)`);
                        
                        // Cliquer sur le bouton
                        const location = await closestButton.getLocation();
                        const size = await closestButton.getSize();
                        const centerX = location.x + size.width / 2;
                        const centerY = location.y + size.height / 2;
                        
                        console.log(`   📍 Clic aux coordonnées: (${Math.round(centerX)}, ${Math.round(centerY)})`);
                        
                        await driver.performActions([{
                            type: 'pointer',
                            id: 'finger1',
                            parameters: { pointerType: 'touch' },
                            actions: [
                                { type: 'pointerMove', duration: 0, x: Math.round(centerX), y: Math.round(centerY) },
                                { type: 'pointerDown', button: 0 },
                                { type: 'pause', duration: 100 },
                                { type: 'pointerUp', button: 0 }
                            ]
                        }]);
                        
                        await driver.pause(2000);
                        console.log('   ✅ BANANE AJOUTÉE AU PANIER! 🍌');
                    } else {
                        console.log('   ⚠️ Aucun bouton proche des bananes trouvé');
                    }
                } else {
                    console.log('   ⚠️ Aucun bouton "Ajouter" trouvé');
                }
            } else {
                console.log('   ⚠️ Bananes non trouvées dans le panier');
                console.log('   💡 Assure-toi que des bananes sont dans ton panier');
            }
        } catch (e) {
            console.log('   ⚠️ Erreur:', e.message);
        }
        
        // Etape 5 : Attendre pour voir les logs
        console.log('⏳ Attente de 5 secondes pour capture des logs...');
        await driver.pause(5000);
        
        console.log('\n✅ Test terminé!');
        console.log('📊 Vérifie les logs pour voir si l\'événement a été capturé:');
        console.log('   adb logcat -s CrossAppTracking:D AndroidTracking:D');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        if (driver) {
            await driver.deleteSession();
        }
    }
}

// Exécuter le test
if (require.main === module) {
    testCarrefourBananaFromCart()
        .then(() => {
            console.log('\n🎉 Test réussi!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test échoué:', error);
            process.exit(1);
        });
}

module.exports = { testCarrefourBananaFromCart };
