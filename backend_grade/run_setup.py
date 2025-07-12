
import subprocess
import sys

def run_setup():
    """Complete setup script to get everything running"""
    
    print("=== JIIT Grade Prediction System Setup ===")
    
    try:
        # Step 1: Generate dataset
        print("\n1. Generating student dataset...")
        subprocess.run([sys.executable, "generate_dataset.py"], check=True)
        
        # Step 2: Train model
        print("\n2. Training prediction model...")
        subprocess.run([sys.executable, "train_model.py"], check=True)
        
        print("\n✅ Setup completed successfully!")
        print("\nTo start the API server, run:")
        print("python app.py")
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Setup failed at step: {e}")
        print("Please check the error messages above.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    run_setup()
