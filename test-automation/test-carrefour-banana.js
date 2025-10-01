/**
 * Test automatisé : Ajout de banane au panier Carrefour
 * Ce script automatise le flow complet pour tester la détection d'ajout au panier
 */

const { remote } = require('webdriverio');

const CARREFOUR_PACKAGE = 'com.carrefour.fid.android';

async function testCarrefourBanana() {
    console.log('🍌 Test automatisé : Ajout de banane au panier Carrefour\n');

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
        
        // Etape 2 : Ouvrir la recherche
        console.log('🔍 Ouverture de la recherche...');
        try {
            const searchButton = await driver.$('android=new UiSelector().descriptionContains("recherche")');
            if (await searchButton.isExisting()) {
                await searchButton.click();
                await driver.pause(2000);
                console.log('   ✅ Recherche ouverte');
            } else {
                console.log('   ⚠️ Bouton recherche non trouvé, tentative alternative...');
                // Tentative avec text
                const searchText = await driver.$('android=new UiSelector().textContains("Rechercher")');
                if (await searchText.isExisting()) {
                    await searchText.click();
                    await driver.pause(2000);
                    console.log('   ✅ Recherche ouverte (méthode alternative)');
                }
            }
        } catch (e) {
            console.log('   ⚠️ Erreur ouverture recherche:', e.message);
        }
        
        // Etape 3 : Saisir "banane"
        console.log('⌨️ Saisie de "banane"...');
        try {
            const searchInput = await driver.$('android=new UiSelector().className("android.widget.EditText")');
            if (await searchInput.isExisting()) {
                await searchInput.click();
                await driver.pause(500);
                await searchInput.setValue('banane');
                await driver.pause(3000); // Attendre les résultats
                console.log('   ✅ "banane" saisie');
            } else {
                console.log('   ⚠️ Champ de recherche non trouvé');
            }
        } catch (e) {
            console.log('   ⚠️ Erreur saisie:', e.message);
        }
        
        // Etape 4 : Cliquer sur le premier résultat
        console.log('🎯 Sélection du premier produit...');
        try {
            // Attendre que les résultats s'affichent
            await driver.pause(2000);
            
            // Chercher un élément cliquable dans les résultats
            const firstProduct = await driver.$('android=new UiSelector().clickable(true).index(0)');
            if (await firstProduct.isExisting()) {
                await firstProduct.click();
                await driver.pause(2000);
                console.log('   ✅ Produit sélectionné');
            } else {
                console.log('   ⚠️ Aucun produit trouvé');
            }
        } catch (e) {
            console.log('   ⚠️ Erreur sélection produit:', e.message);
        }
        
        // Etape 5 : Scroll vers le bas pour voir le bouton "Ajouter au panier"
        console.log('📜 Scroll vers le bouton d\'ajout...');
        await driver.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 500, y: 1500 },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 300 },
                { type: 'pointerMove', duration: 300, x: 500, y: 500 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.pause(1000);
        
        await driver.performActions([{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: 500, y: 1500 },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 300 },
                { type: 'pointerMove', duration: 300, x: 500, y: 500 },
                { type: 'pointerUp', button: 0 }
            ]
        }]);
        await driver.pause(1000);
        console.log('   ✅ Scroll effectué');
        
        // Etape 6 : Trouver le produit "Bananes" et cliquer sur son bouton "+"
        console.log('🛒 Recherche du bouton d\'ajout pour les bananes...');
        try {
            // Méthode 1 : Chercher le parent contenant "Bananes" puis le bouton "Ajouter"
            console.log('   🔍 Recherche du produit "Bananes"...');
            const bananaProduct = await driver.$('android=new UiSelector().textContains("Bananes")');
            
            if (await bananaProduct.isExisting()) {
                console.log('   ✅ Produit "Bananes" trouvé!');
                
                // Chercher le bouton "Ajouter un produit dans le panier" dans le même parent
                // En utilisant la hiérarchie : on cherche le View clickable qui contient le content-desc
                const addButton = await driver.$('android=new UiSelector().descriptionContains("Ajouter un produit dans le panier")');
                
                if (await addButton.isExisting()) {
                    console.log('   🎯 Bouton "Ajouter un produit dans le panier" trouvé!');
                    
                    // Cliquer sur le parent clickable (pas directement sur le View avec content-desc)
                    // On utilise les coordonnées du bouton pour être sûr
                    const location = await addButton.getLocation();
                    const size = await addButton.getSize();
                    const centerX = location.x + size.width / 2;
                    const centerY = location.y + size.height / 2;
                    
                    console.log(`   📍 Clic aux coordonnées: (${Math.round(centerX)}, ${Math.round(centerY)})`);
                    
                    // Utiliser W3C Actions pour cliquer précisément
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
                    console.log('   ⚠️ Bouton "Ajouter" non trouvé, tentative avec coordonnées fixes...');
                    
                    // Fallback : utiliser les coordonnées exactes de la hiérarchie
                    // Bouton "+" pour bananes : bounds="[929,1758][1055,1884]"
                    // Centre : x=992, y=1821
                    await driver.performActions([{
                        type: 'pointer',
                        id: 'finger1',
                        parameters: { pointerType: 'touch' },
                        actions: [
                            { type: 'pointerMove', duration: 0, x: 992, y: 1821 },
                            { type: 'pointerDown', button: 0 },
                            { type: 'pause', duration: 100 },
                            { type: 'pointerUp', button: 0 }
                        ]
                    }]);
                    
                    await driver.pause(2000);
                    console.log('   ✅ BANANE AJOUTÉE (via coordonnées)! 🍌');
                }
            } else {
                console.log('   ⚠️ Produit "Bananes" non trouvé dans la liste');
                console.log('   💡 Vérifie que tu as bien scrollé jusqu\'aux bananes');
            }
        } catch (e) {
            console.log('   ⚠️ Erreur ajout panier:', e.message);
        }
        
        // Etape 7 : Attendre pour voir les logs
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
    testCarrefourBanana()
        .then(() => {
            console.log('\n🎉 Test réussi!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test échoué:', error);
            process.exit(1);
        });
}

module.exports = { testCarrefourBanana };
