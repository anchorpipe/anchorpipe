# Jenkins Integration

This guide shows you how to integrate Anchorpipe with Jenkins pipelines.

## Overview

Jenkins is a self-hosted automation server. This guide shows you how to submit test results to Anchorpipe from Jenkins pipelines using Groovy.

## Prerequisites

- Jenkins server with pipeline support
- An Anchorpipe account with a repository configured
- HMAC secret from Anchorpipe (see [CI Integration Guide](ci-integration) for details)

## Setup

### 1. Add Jenkins Credentials

Navigate to Jenkins → Manage Jenkins → Credentials → System → Global credentials, and add:

- `anchorpipe-repo-id`: Secret text containing your repository UUID
- `anchorpipe-hmac-secret`: Secret text containing your HMAC secret

### 2. Create Pipeline

Create a `Jenkinsfile` in your repository:

```groovy
pipeline {
    agent any

    environment {
        ANCHORPIPE_REPO_ID = credentials('anchorpipe-repo-id')
        ANCHORPIPE_HMAC_SECRET = credentials('anchorpipe-hmac-secret')
    }

    stages {
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm test -- --json --outputFile=test-results.json'
            }
        }

        stage('Submit to Anchorpipe') {
            steps {
                script {
                    def payload = readFile('test-results.json')
                    def signature = sh(
                        script: "echo -n '${payload}' | openssl dgst -sha256 -hmac '${env.ANCHORPIPE_HMAC_SECRET}' | cut -d' ' -f2",
                        returnStdout: true
                    ).trim()

                    sh """
                        curl -X POST \\
                            -H "Authorization: Bearer ${env.ANCHORPIPE_REPO_ID}" \\
                            -H "X-FR-Sig: ${signature}" \\
                            -H "Content-Type: application/json" \\
                            -d '${payload}' \\
                            https://api.anchorpipe.dev/api/ingestion
                    """
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'test-results.json', fingerprint: true
        }
    }
}
```

## Using Pipeline Libraries

For reusable code, create a shared library:

```groovy
// vars/submitToAnchorpipe.groovy
def call(String resultsFile) {
    withCredentials([
        string(credentialsId: 'anchorpipe-repo-id', variable: 'REPO_ID'),
        string(credentialsId: 'anchorpipe-hmac-secret', variable: 'HMAC_SECRET')
    ]) {
        def payload = readFile(resultsFile)
        def signature = sh(
            script: "echo -n '${payload}' | openssl dgst -sha256 -hmac '${HMAC_SECRET}' | cut -d' ' -f2",
            returnStdout: true
        ).trim()

        sh """
            curl -X POST \\
                -H "Authorization: Bearer ${REPO_ID}" \\
                -H "X-FR-Sig: ${signature}" \\
                -H "Content-Type: application/json" \\
                -d '${payload}' \\
                https://api.anchorpipe.dev/api/ingestion
        """
    }
}
```

Then use it in your pipeline:

```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                sh 'npm test -- --json --outputFile=test-results.json'
            }
        }
        stage('Submit') {
            steps {
                submitToAnchorpipe('test-results.json')
            }
        }
    }
}
```

## Using Declarative Pipeline

```groovy
pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                sh 'npm test -- --json --outputFile=test-results.json'
            }
        }
        stage('Submit') {
            steps {
                script {
                    withCredentials([
                        string(credentialsId: 'anchorpipe-repo-id', variable: 'REPO_ID'),
                        string(credentialsId: 'anchorpipe-hmac-secret', variable: 'HMAC_SECRET')
                    ]) {
                        def payload = readFile('test-results.json')
                        def signature = sh(
                            script: "echo -n '${payload}' | openssl dgst -sha256 -hmac '${HMAC_SECRET}' | cut -d' ' -f2",
                            returnStdout: true
                        ).trim()

                        sh """
                            curl -X POST \\
                                -H "Authorization: Bearer ${REPO_ID}" \\
                                -H "X-FR-Sig: ${signature}" \\
                                -H "Content-Type: application/json" \\
                                -d '${payload}' \\
                                https://api.anchorpipe.dev/api/ingestion
                        """
                    }
                }
            }
        }
    }
}
```

## Best Practices

1. **Use credentials binding** to securely store secrets
2. **Archive test results** for debugging
3. **Add error handling** to prevent pipeline failures
4. **Use shared libraries** for reusable code
5. **Test locally** using Jenkins CLI or Blue Ocean

## Troubleshooting

### Credentials Not Found

- Verify credentials are added in Jenkins
- Check credential IDs match exactly
- Ensure credentials are accessible to the pipeline

### OpenSSL Not Available

- Install openssl in your Jenkins agent
- Use a Docker agent with openssl pre-installed
- Consider using a Jenkins plugin for HMAC computation

## Related Documentation

- [CI Integration Guide](ci-integration) - General authentication and API details
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/) - Official Jenkins docs
