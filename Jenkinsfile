pipeline {
    agent any  // Le pipleine peut s'executer sur n'importe quel agent disponible 

    options { skipDefaultCheckout(true) }

    // mise en place d'un trigger pour declencher le pipeline automatiquement toutes les minutes si un push est detecte sur le depot Git
    // min heure, jour, mois, jour de la semaine
    triggers { pollSCM('* * * * *') }  

    parameters {
        booleanParam(name: 'SIMULER_ECHEC_PROD', defaultValue: false,
                     description: 'Cocher pour simuler un echec en production (demo du rollback)')
    }

    environment {
        // nom de l'image dans le registre local
        IMAGE     = 'localhost:5000/pfe-track' 

        // tag de l'image (numero de build Jenkins)
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        // ================= CI =================
        stage('00 Declenchement') {
            steps { echo "Pipeline declenche (push detecte ou lancement manuel) - build ${env.BUILD_NUMBER}" }
        }
        stage('04 Recuperation du code') {
            steps {
                checkout scm
                bat 'git log -1 --oneline' // affichage du dernier commit
            }
        }
        stage('05 Installation des dependances') {
            steps {
                bat 'docker pull php:8.2-cli'
                bat 'docker pull php:8.2-apache'
                bat 'docker pull mysql:8.0'
            }
        }
        stage('06 Analyse statique') {
            steps {
                bat '''docker run --rm -v "%WORKSPACE%:/app" -w /app php:8.2-cli sh -c "find backend -name '*.php' -print0 | xargs -0 -n1 php -l"'''
            }
        }
        stage('07 Build') {
            steps {
                bat 'if exist dist rmdir /S /Q dist'
                bat 'xcopy backend dist\\backend /E /I /Q /Y'
                bat 'xcopy frontend dist\\frontend /E /I /Q /Y'
                bat 'xcopy database dist\\database /E /I /Q /Y'
            }
        }
        stage('08 Tests automatises') {
            steps {
                bat '''docker run --rm -v "%WORKSPACE%:/app" -w /app php:8.2-cli php tests/run_tests.php'''
            }
        }
        stage('09 Packaging (image Docker)') {
            steps {
                bat 'docker build -f Dockerfile -t %IMAGE%:%IMAGE_TAG% -t %IMAGE%:latest dist'
            }
        }
        stage('10 Publication (registre)') {
            steps {
                bat 'docker push %IMAGE%:%IMAGE_TAG%'
                bat 'docker push %IMAGE%:latest'
                bat 'curl.exe -s http://localhost:5000/v2/pfe-track/tags/list'
            }
        }
        stage('11 Feedback CI') {
            steps { echo "CI terminee : image pfe-track:${env.BUILD_NUMBER} publiee dans le registre." }
        }

        // ================= CD =================
        stage('12 Recuperation de l artefact') {
            steps { bat 'docker pull %IMAGE%:%IMAGE_TAG%' }
        }
        stage('13 Deploiement en staging') {
            steps {
                withEnv(['APP_PORT=8091']) {
                    bat 'docker-compose -p pfe-staging up -d'
                }
            }
        }
        stage('14 Tests post-deploiement') {
            steps {
                bat 'curl.exe -f -s --retry 15 --retry-delay 4 --retry-connrefused --retry-all-errors http://localhost:8091/pfe-track/backend/api/test.php | findstr connected'
                bat 'curl.exe -f -s -o nul http://localhost:8091/pfe-track/frontend/login.html'
            }
        }
        stage('15 Validation / approbation') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    input message: 'Valider le deploiement en production ?', ok: 'Oui, deployer'
                }
            }
        }
        stage('16 Deploiement en production') {
            steps {
                withEnv(['APP_PORT=8082']) {
                    bat 'docker-compose -p pfe-prod up -d'
                }
            }
        }
        stage('17 Verification en production') {
            steps {
                script {
                    env.PROD_OK = 'true'
                    try {
                        if (params.SIMULER_ECHEC_PROD) {
                            bat 'curl.exe -f -s -o nul http://localhost:8082/pfe-track/page-inexistante.html'
                        } else {
                            bat 'curl.exe -f -s --retry 15 --retry-delay 4 --retry-connrefused --retry-all-errors http://localhost:8082/pfe-track/backend/api/test.php | findstr connected'
                            writeFile file: 'last_good.txt', text: env.BUILD_NUMBER
                        }
                    } catch (err) {
                        env.PROD_OK = 'false'
                        echo "Verification en echec : ${err}"
                    }
                }
            }
        }
        stage('18 Supervision (monitoring)') {
            steps {
                bat 'docker-compose -p pfe-prod ps'
                bat 'docker stats --no-stream'
                bat 'docker-compose -p pfe-prod logs --tail 5 app'
            }
        }
        stage('19 Rollback en cas d echec') {
            when { expression { env.PROD_OK == 'false' } }
            steps {
                script {
                    def prev = fileExists('last_good.txt') ? readFile('last_good.txt').trim() : 'latest'
                    echo "ROLLBACK : retour a la version ${prev}"
                    withEnv(["IMAGE_TAG=${prev}", 'APP_PORT=8082']) {
                        bat 'docker-compose -p pfe-prod up -d'
                    }
                    unstable('Rollback effectue')
                }
            }
        }
        stage('20 Feedback') {
            steps {
                script {
                    if (env.PROD_OK == 'false') {
                        echo 'FEEDBACK : echec en production, rollback effectue.'
                    } else {
                        echo "FEEDBACK : version ${env.BUILD_NUMBER} en production sur http://localhost:8082/pfe-track/frontend/index.html"
                    }
                }
            }
        }
    }

    post {
        failure { echo 'FEEDBACK : le pipeline a echoue, voir l etape en rouge.' }
    }
}