# Jenkins CI/CD Setup — QuantumDefense

## 🔑 Jenkins Credentials

| | |
|---|---|
| **URL** | `http://32.196.226.99:8080` |
| **Initial Admin Password** | `ee04e0fad5184affb96e21012c74e5e9` |
| **Java Version** | OpenJDK 21.0.11 ✅ |
| **Status** | Active ✅ |

---

## PHASE 1 — First-Time Jenkins Setup

### Step 1 — Unlock Jenkins
1. Open `http://32.196.226.99:8080` in your browser
2. Paste this password when prompted:
   ```
   ee04e0fad5184affb96e21012c74e5e9
   ```

### Step 2 — Install Plugins
When asked "Customize Jenkins":
- Click **"Install suggested plugins"** and wait for it to finish (~3 min)
- Then go to **Manage Jenkins → Plugins → Available plugins** and install these additional ones:
  - `Kubernetes CLI Plugin` (search: `kubernetes-cli`)
  - `Amazon ECR Plugin` (search: `amazon-ecr`)
  - `AWS Credentials Plugin` (search: `aws-credentials`)
  - `GitHub Integration Plugin` (search: `github`)
  - `Pipeline` (usually pre-installed)

> After installing, click **Restart Jenkins** when prompted.

### Step 3 — Create Your Admin Account
Fill in your username, password, name, and email when prompted. Save and continue.

---

## PHASE 2 — Add Credentials to Jenkins

Go to: **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

### Credential 1: AWS Keys (for ECR push)

| Field | Value |
|---|---|
| Kind | `AWS Credentials` |
| ID | `aws-ecr-credentials` ← must match Jenkinsfile exactly |
| Access Key ID | `AKIAQPGY4JRT6YU2S` (your IAM user key) |
| Secret Access Key | (your secret key from `~/.aws/credentials`) |

> Get your keys by running: `cat ~/.aws/credentials` on your Mac

### Credential 2: EKS Kubeconfig (for kubectl deploys)

1. First, export your current kubeconfig on your Mac:
   ```bash
   cat ~/.kube/config
   ```
2. In Jenkins: **Add Credentials**

| Field | Value |
|---|---|
| Kind | `Secret file` |
| ID | `eks-kubeconfig` ← must match Jenkinsfile exactly |
| File | Upload the kubeconfig file from `~/.kube/config` |

---

## PHASE 3 — Create the Pipeline Job

### Step 1 — New Item
1. Click **"New Item"** on Jenkins home
2. Enter name: `QuantumDefense-CI-CD`
3. Select **"Pipeline"** → Click OK

### Step 2 — Configure Pipeline Source
Scroll down to the **Pipeline** section:

| Setting | Value |
|---|---|
| Definition | `Pipeline script from SCM` |
| SCM | `Git` |
| Repository URL | `https://github.com/HakashiKatake/QuantumDefence.git` |
| Branch | `*/main` |
| Script Path | `jenkins/Jenkinsfile` |

> If repo is private, add GitHub credentials too. If it's public, leave credentials as "None".

### Step 3 — GitHub Webhook (auto-trigger on push)
1. In the job config, under **Build Triggers**, check:
   ✅ **"GitHub hook trigger for GITScm polling"**

2. In GitHub → your repo → **Settings → Webhooks → Add webhook**:
   - Payload URL: `http://32.196.226.99:8080/github-webhook/`
   - Content type: `application/json`
   - Trigger: **"Just the push event"**
   - Click **Add webhook**

### Step 4 — Save the Job
Click **Save**.

---

## PHASE 4 — Run Your First Build

### Manual trigger (to test now):
1. Click **"Build Now"** on the pipeline job page
2. Click the build number → **"Console Output"** to watch it live

### What the pipeline does (5 stages):

```
Checkout Source
    └── Pulls latest code from GitHub main branch
           ↓
Static Analysis & Test  [PARALLEL]
    ├── Auth Service lint
    ├── Command Service lint
    ├── Threat Service lint
    ├── Mission Service lint
    └── Frontend lint
           ↓
Docker Compilation
    └── Builds all 5 images (linux/amd64)
           ↓
Registry Upload
    └── Pushes all 5 images to ECR
           ↓
Kubernetes Orchestration
    └── kubectl apply all manifests + rollout restart
           ↓
Health Validation
    └── Waits for all deployments to be Ready ✅
```

---

## PHASE 5 — Test the Full CI/CD Loop

To verify the whole pipeline works end-to-end:

1. Make a small change to any file, e.g. edit `frontend/src/App.jsx` and change a color or text
2. Commit and push to `main`:
   ```bash
   git add -A
   git commit -m "test: trigger CI/CD pipeline"
   git push origin main
   ```
3. GitHub sends the webhook → Jenkins auto-triggers the build
4. Watch the pipeline in Jenkins Console Output
5. After ~10-15 min, refresh the live URL — your change should be visible

---

## Quick Reference

| | |
|---|---|
| Jenkins URL | `http://32.196.226.99:8080` |
| Jenkins Password | `ee04e0fad5184affb96e21012c74e5e9` |
| GitHub Webhook URL | `http://32.196.226.99:8080/github-webhook/` |
| Jenkinsfile location | `jenkins/Jenkinsfile` |
| Credential ID (AWS) | `aws-ecr-credentials` |
| Credential ID (K8s) | `eks-kubeconfig` |
