# LangGraph Playground


## 1️⃣ Prerequisites

- Python 3.12+
- pip or pipx

---

## 2️⃣ Project Setup

1. Create and activate a virtual environment:

```bash
python3 -m venv venv
Windows (Command Prompt): venv/Scripts/Activate
Windows (PowerShell): venv\Scripts\Activate.ps1
Mac: source venv/bin/activate
```

Setup using conda

```bash
conda create --name langgraph python=3.12.4
conda activate langgraph
```

Deactivate the environment: 
```bash
conda deactivate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

---

## 3️⃣ Running the Program

```bash
streamlit run sample.py
```

```bash
python sample.py
```