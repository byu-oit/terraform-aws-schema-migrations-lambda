if [ $# -eq 0 ]
then
  echo "Nothing to release. Please supply at least one release parameter."
  exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" != "master" ]]
then
  echo "You must be on the master branch to release!"
  exit 1
fi

if [[ -n $(git status -s) ]]
then
  echo "Please commit any changes before merging to a release branch"
  exit 1
fi

for b in "$@"
do
    git checkout -q -B $b
    git merge master
    git push origin $b
    echo "Released branch $b"
    git checkout -q master
done