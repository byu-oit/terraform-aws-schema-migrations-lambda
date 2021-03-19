argNum=1
if [ $# -ne $argNum ]
then
  echo "Expected $argNum arguments, but got $#."
  exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" != "master" ]]
then
  echo "You must be on the master branch to release!"
  exit 1
fi

if [[ -z $(git status -s) ]]
then
  git checkout $1
  git merge master
  git push origin $1
  git checkout master
else
  echo "Please commit any changes before merging to release"
  exit 1
fi